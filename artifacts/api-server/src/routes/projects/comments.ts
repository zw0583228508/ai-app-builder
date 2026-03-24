import { Router, Request, Response } from "express";
import {
  db,
  codeCommentsTable,
  projectFilesTable,
  projectsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router({ mergeParams: true });

// GET /api/projects/:id/files/:fileId/comments
router.get(
  "/:id/files/:fileId/comments",
  async (req: Request, res: Response) => {
    const fileId = Number(req.params.fileId);
    const comments = await db
      .select()
      .from(codeCommentsTable)
      .where(eq(codeCommentsTable.fileId, fileId))
      .orderBy(codeCommentsTable.lineNumber);
    res.json({ comments });
  },
);

// POST /api/projects/:id/files/:fileId/comments
router.post(
  "/:id/files/:fileId/comments",
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const fileId = Number(req.params.fileId);
    const { lineNumber, body } = req.body as {
      lineNumber?: number;
      body?: string;
    };
    if (!lineNumber || !body?.trim()) {
      res.status(400).json({ error: "lineNumber and body required" });
      return;
    }
    const [comment] = await db
      .insert(codeCommentsTable)
      .values({ fileId, userId, lineNumber, body: body.trim() })
      .returning();
    res.status(201).json({ comment });
  },
);

// PATCH /api/projects/:id/comments/:commentId — resolve/unresolve
router.patch(
  "/:id/comments/:commentId",
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const commentId = Number(req.params.commentId);
    const { resolved } = req.body as { resolved?: number };
    const [comment] = await db
      .update(codeCommentsTable)
      .set({ resolved: resolved ?? 1 })
      .where(eq(codeCommentsTable.id, commentId))
      .returning();
    res.json({ comment });
  },
);

// DELETE /api/projects/:id/comments/:commentId
router.delete(
  "/:id/comments/:commentId",
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const commentId = Number(req.params.commentId);
    await db
      .delete(codeCommentsTable)
      .where(
        and(
          eq(codeCommentsTable.id, commentId),
          eq(codeCommentsTable.userId, userId),
        ),
      );
    res.json({ ok: true });
  },
);

export default router;
