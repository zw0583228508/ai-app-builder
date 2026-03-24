import { Router, Request, Response } from "express";
import { db, teamsTable, teamMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "node:crypto";

const router = Router();

// GET /api/teams — list teams for current user
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const ownedTeams = await db.select().from(teamsTable).where(eq(teamsTable.ownerId, userId));

  const memberships = await db
    .select({ team: teamsTable, role: teamMembersTable.role })
    .from(teamMembersTable)
    .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(eq(teamMembersTable.userId, userId));

  res.json({ owned: ownedTeams, member: memberships });
});

// POST /api/teams — create a team
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Team name is required" }); return; }

  const [team] = await db.insert(teamsTable).values({ name: name.trim(), ownerId: userId }).returning();
  await db.insert(teamMembersTable).values({ teamId: team.id, userId, role: "owner" });

  res.status(201).json({ team });
});

// GET /api/teams/:id — team details with members
router.get("/:id", async (req: Request, res: Response) => {
  const teamId = Number(req.params.id);
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  const members = await db
    .select({
      id: teamMembersTable.id,
      userId: teamMembersTable.userId,
      role: teamMembersTable.role,
      joinedAt: teamMembersTable.joinedAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(teamMembersTable)
    .leftJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
    .where(eq(teamMembersTable.teamId, teamId));

  res.json({ team, members });
});

// POST /api/teams/join — join a team via invite code
router.post("/join", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode) { res.status(400).json({ error: "inviteCode is required" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.inviteCode, inviteCode.trim()));
  if (!team) { res.status(404).json({ error: "Invalid invite code" }); return; }

  const [existing] = await db.select().from(teamMembersTable)
    .where(and(eq(teamMembersTable.teamId, team.id), eq(teamMembersTable.userId, userId)));
  if (existing) { res.status(409).json({ error: "Already a member of this team" }); return; }

  await db.insert(teamMembersTable).values({ teamId: team.id, userId, role: "editor" });

  res.status(201).json({ team });
});

// POST /api/teams/:id/invite-email — Issue 57: send email invite via Resend
router.post("/:id/invite-email", async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const teamId = Number(req.params.id);
  const { email } = req.body as { email?: string };
  if (!email?.trim()) { res.status(400).json({ error: "email is required" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  if (team.ownerId !== userId) { res.status(403).json({ error: "Only team owner can invite" }); return; }

  // Generate or reuse invite code
  const inviteCode = team.inviteCode ?? randomBytes(6).toString("hex");
  if (!team.inviteCode) {
    await db.update(teamsTable).set({ inviteCode }).where(eq(teamsTable.id, teamId));
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    res.json({ ok: true, inviteCode, emailSent: false, reason: "RESEND_API_KEY not configured" });
    return;
  }

  const inviteLink = `${process.env["REPLIT_DEV_DOMAIN"] ?? "https://app.example.com"}/join?code=${inviteCode}`;

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@app.ai-builder.io",
        to: [email.trim()],
        subject: `הוזמנת להצטרף לצוות "${team.name}"`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">הוזמנת לצוות! 🎉</h2>
            <p>הוזמנת להצטרף לצוות <strong>${team.name}</strong> ב-AI App Builder.</p>
            <p>
              <a href="${inviteLink}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
                הצטרף לצוות
              </a>
            </p>
            <p style="color:#666;">קוד הזמנה: <code>${inviteCode}</code></p>
          </div>
        `,
      }),
    });
    const emailData = await emailRes.json() as { id?: string; error?: string };
    if (!emailRes.ok) {
      res.status(502).json({ error: "Email send failed", detail: emailData });
      return;
    }
    res.json({ ok: true, inviteCode, emailSent: true, emailId: emailData.id });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Email failed" });
  }
});

// DELETE /api/teams/:id/members/:memberId — remove a member
router.delete("/:id/members/:memberId", async (req: Request, res: Response) => {
  const teamId = Number(req.params.id as string);
  const targetUserId = req.params.memberId as string;
  const requesterId = req.user?.id;
  if (!requesterId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  if (team.ownerId !== requesterId && targetUserId !== requesterId) {
    res.status(403).json({ error: "Only the team owner can remove members" }); return;
  }

  await db.delete(teamMembersTable).where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, targetUserId)));

  res.json({ ok: true });
});

export default router;
