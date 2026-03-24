import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { logger } from "../lib/logger";
import { getSession } from "../lib/auth";
import { buildSafeEnv, isCommandBlocked } from "../utils/terminal-safety";

// SECURITY: Terminal opens a real bash shell. No per-user container isolation exists.
// Only enable in Replit (managed sandboxing) or when running inside Docker per-user containers.
// Never enable in shared-server deployments.
const TERMINAL_ENABLED = process.env["ENABLE_TERMINAL"] === "true";

type Msg =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "ping" };

function send(ws: WebSocket, type: string, data: string) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ type, data }));
}

async function resolveSession(
  req: IncomingMessage,
): Promise<{ userId: string } | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const sidFromCookie = cookieHeader.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  const authHeader = req.headers["authorization"] as string | undefined;
  const sidFromBearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const sid = sidFromCookie ?? sidFromBearer;
  if (!sid) return null;
  const session = await getSession(sid).catch(() => null);
  if (!session?.user?.id) return null;
  return { userId: session.user.id };
}

export async function handleTerminalWs(ws: WebSocket, req: IncomingMessage) {
  if (!TERMINAL_ENABLED) {
    logger.warn(
      "Terminal WebSocket rejected — terminal disabled in this environment",
    );
    ws.close(4002, "Terminal is disabled");
    return;
  }

  const resolved = await resolveSession(req);
  if (!resolved) {
    logger.warn("Terminal WebSocket rejected — unauthenticated");
    ws.close(4001, "Unauthorized");
    return;
  }

  logger.info({ userId: resolved.userId }, "Terminal WebSocket connected");

  let shell: ChildProcessWithoutNullStreams | null = null;

  function spawnShell() {
    shell = spawn("bash", ["--norc", "--noprofile", "-i"], {
      env: buildSafeEnv(),
      cwd: process.env["HOME"] || "/home/runner",
    });

    shell.stdout.on("data", (data: Buffer) =>
      send(ws, "output", data.toString("utf8")),
    );
    shell.stderr.on("data", (data: Buffer) =>
      send(ws, "output", data.toString("utf8")),
    );
    shell.on("close", (code) => {
      send(
        ws,
        "output",
        `\r\n\x1b[33m[Session ended with code ${code}]\x1b[0m\r\n`,
      );
      shell = null;
    });
    shell.on("error", (err) => {
      send(ws, "output", `\r\n\x1b[31m[Error: ${err.message}]\x1b[0m\r\n`);
    });
  }

  spawnShell();

  send(
    ws,
    "output",
    "\x1b[1;36m╔══════════════════════════════════════╗\x1b[0m\r\n" +
      "\x1b[1;36m║    🖥️  בונה AI — טרמינל             ║\x1b[0m\r\n" +
      "\x1b[1;36m╚══════════════════════════════════════╝\x1b[0m\r\n" +
      "\x1b[90mסביבת שרת · bash · node.js זמין\x1b[0m\r\n" +
      "\x1b[90m⚠️  פקודות מסוכנות חסומות מטעמי אבטחה\x1b[0m\r\n\r\n",
  );

  ws.on("message", (raw) => {
    let msg: Msg;
    try {
      msg = JSON.parse(raw.toString()) as Msg;
    } catch {
      return;
    }

    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (msg.type === "input" && shell && shell.stdin.writable) {
      const line = msg.data.replace(/\r?\n$/, "");
      if (isCommandBlocked(line)) {
        send(ws, "output", "\r\n\x1b[31m⛔ פקודה חסומה מטעמי אבטחה\x1b[0m\r\n");
        logger.warn(
          { userId: resolved.userId, cmd: line.slice(0, 100) },
          "Terminal: blocked dangerous command",
        );
        return;
      }
      shell.stdin.write(msg.data);
    }

    if (msg.type === "resize" && shell) {
      try {
        (
          shell as unknown as { resize?: (c: number, r: number) => void }
        ).resize?.(msg.cols, msg.rows);
      } catch {
        /* PTY resize not available */
      }
    }
  });

  ws.on("close", () => {
    logger.info({ userId: resolved.userId }, "Terminal WebSocket disconnected");
    if (shell) {
      shell.kill("SIGTERM");
      shell = null;
    }
  });

  ws.on("error", (err) => {
    logger.error({ err, userId: resolved.userId }, "Terminal WebSocket error");
    if (shell) {
      shell.kill("SIGTERM");
      shell = null;
    }
  });
}
