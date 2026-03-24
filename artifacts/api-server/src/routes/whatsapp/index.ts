import { Router } from "express";
import type { IncomingMessage } from "http";
import type { WebSocket as WsSocket } from "ws";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  db,
  projectsTable,
  projectDnaTable,
  projectMessagesTable,
  analyticsEventsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ── Session store: projectId → socket ──────────────────────────────────────
const sessions = new Map<
  number,
  {
    sock: ReturnType<typeof makeWASocket> | null;
    qr: string | null;
    status: "disconnected" | "connecting" | "qr" | "connected";
    jid: string | null;
  }
>();

const AUTH_DIR = path.join(process.cwd(), ".whatsapp-auth");
fs.mkdirSync(AUTH_DIR, { recursive: true });

// ── Hebrew action router ────────────────────────────────────────────────────
async function handleWhatsAppMessage(
  projectId: number,
  from: string,
  text: string,
): Promise<string> {
  const lower = text.trim().toLowerCase();
  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .then((r) => r[0]);

  if (!project) return "❌ פרויקט לא נמצא";

  // ── Analytics query ──
  if (
    lower.includes("כמה ביקורים") ||
    lower.includes("סטטיסטיקות") ||
    lower.includes("analytics") ||
    lower.includes("כמה אנשים")
  ) {
    const events = await db
      .select()
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.projectId, projectId))
      .orderBy(desc(analyticsEventsTable.createdAt));
    const pageviews = events.filter((e) => e.type === "pageview").length;
    const clicks = events.filter((e) => e.type === "click").length;
    const errors = events.filter((e) => e.type === "error").length;
    return `📊 *סטטיסטיקות הפרויקט — שבוע אחרון*\n\n👁️ צפיות: ${pageviews}\n🖱️ קליקים: ${clicks}\n❌ שגיאות: ${errors}`;
  }

  // ── Deploy trigger (Issue 68: actually calls deploy API) ──
  if (
    lower === "פרסם" ||
    lower === "deploy" ||
    lower.includes("פרסם את האתר")
  ) {
    try {
      const devDomain = process.env["REPLIT_DEV_DOMAIN"] ?? "localhost";
      const deployRes = await fetch(
        `http://localhost:${process.env.PORT ?? 8080}/api/projects/${projectId}/deploy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "netlify", projectId }),
        },
      );
      if (deployRes.ok) {
        const deployData = (await deployRes.json()) as {
          url?: string;
          deployUrl?: string;
        };
        const url = deployData.url ?? deployData.deployUrl ?? devDomain;
        return `✅ הפרויקט פורסם בהצלחה!\n\n🔗 ${url}`;
      } else {
        return `⚠️ הפרסום החל אך הייתה בעיה בבדיקת הסטטוס. בדוק את לשונית הפריסה באפליקציה.`;
      }
    } catch {
      return `🚀 בקשת הפרסום נשלחה! בדוק את לשונית הפריסה באפליקציה.\n\n📱 ${process.env["REPLIT_DEV_DOMAIN"] ?? ""}`;
    }
  }

  // ── CSS color change ──
  const colorMatch =
    text.match(/שנה צבע ל([^\s]+)/i) || text.match(/change color to ([^\s]+)/i);
  if (colorMatch?.[1]) {
    const color = colorMatch[1];
    return `🎨 בקשת שינוי צבע ל-${color} נרשמה!\n\nכדי להחיל — כתוב בצ'אט של הפרויקט:\n"שנה את הצבע הראשי ל-${color}"`;
  }

  // ── General AI query about the project ──
  const dna = await db
    .select()
    .from(projectDnaTable)
    .where(eq(projectDnaTable.projectId, projectId))
    .then((r) => r[0]);

  const dnaContext = dna
    ? `מידע על הפרויקט: מטרה: ${dna.primaryGoal ?? "?"}, קהל: ${dna.targetAudience ?? "?"}`
    : "";

  const prompt = `אתה עוזר AI לאפליקציית בנייה. משתמש שואל שאלה על הפרויקט שלו ב-WhatsApp.
${dnaContext}

שאלה: ${text}

ענה בעברית בלבד, בקצרה (מקסימום 3 משפטים). השתמש ב-emojis.`;

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    return res.content[0].type === "text"
      ? res.content[0].text
      : "❓ לא הצלחתי לענות";
  } catch {
    return "❌ שגיאה בעיבוד הבקשה";
  }
}

// ── Connect / start session ─────────────────────────────────────────────────
async function startSession(projectId: number) {
  if (sessions.get(projectId)?.status === "connected") return;

  sessions.set(projectId, {
    sock: null,
    qr: null,
    status: "connecting",
    jid: null,
  });

  const authDir = path.join(AUTH_DIR, String(projectId));
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: { level: "silent" } as Parameters<typeof makeWASocket>[0]["logger"],
  });

  const session = sessions.get(projectId)!;
  session.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    const s = sessions.get(projectId)!;

    if (qr) {
      s.qr = qr;
      s.status = "qr";
    }

    if (connection === "open") {
      s.status = "connected";
      s.qr = null;
      s.jid = sock.user?.id ?? null;
      console.log(`[WhatsApp] Project ${projectId} connected as ${s.jid}`);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        setTimeout(() => startSession(projectId), 5000);
      } else {
        s.status = "disconnected";
        s.sock = null;
        // Clear auth on logout
        fs.rmSync(authDir, { recursive: true, force: true });
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";
      if (!text) continue;

      const from = msg.key.remoteJid ?? "";
      const reply = await handleWhatsAppMessage(projectId, from, text);
      await sock.sendMessage(from, { text: reply });
    }
  });
}

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/whatsapp/:projectId/connect
router.post("/:projectId/connect", async (req, res) => {
  const projectId = parseInt(req.params["projectId"] ?? "");
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const existing = sessions.get(projectId);
  if (existing?.status === "connected") {
    res.json({ status: "connected", jid: existing.jid });
    return;
  }

  startSession(projectId).catch(console.error);

  // Wait up to 15s for a QR code to appear
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const s = sessions.get(projectId);
    if (s?.qr) break;
    if (s?.status === "connected") break;
  }

  const s = sessions.get(projectId);
  res.json({
    status: s?.status ?? "connecting",
    qr: s?.qr ?? null,
    jid: s?.jid ?? null,
  });
});

// GET /api/whatsapp/:projectId/status
router.get("/:projectId/status", (req, res) => {
  const projectId = parseInt(req.params["projectId"] ?? "");
  const s = sessions.get(projectId);
  res.json({
    status: s?.status ?? "disconnected",
    qr: s?.qr ?? null,
    jid: s?.jid ?? null,
  });
});

// POST /api/whatsapp/:projectId/disconnect
router.post("/:projectId/disconnect", async (req, res) => {
  const projectId = parseInt(req.params["projectId"] ?? "");
  const s = sessions.get(projectId);
  if (s?.sock) {
    await s.sock.logout().catch(() => {});
    s.status = "disconnected";
    s.sock = null;
    sessions.delete(projectId);
  }
  res.json({ ok: true });
});

// ── Issue 18: Restore active sessions after server restart ───────────────────
export async function restoreActiveSessions(): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) return;
  const entries = fs.readdirSync(AUTH_DIR);
  for (const entry of entries) {
    const projectId = parseInt(entry, 10);
    if (!isNaN(projectId) && !sessions.has(projectId)) {
      startSession(projectId).catch(() => {});
    }
  }
}

export default router;
