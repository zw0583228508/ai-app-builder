import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { projectStorageObjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../../lib/objectStorage";

const storageService = new ObjectStorageService();

const router = Router({ mergeParams: true });

// GET /api/projects/:id/storage — list objects
router.get("/", async (req: Request, res: Response) => {
  const projectId = Number((req.params as Record<string, string>).id);
  if (!projectId) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const objects = await db
    .select()
    .from(projectStorageObjectsTable)
    .where(eq(projectStorageObjectsTable.projectId, projectId))
    .orderBy(projectStorageObjectsTable.createdAt);

  res.json({ objects });
});

// POST /api/projects/:id/storage/upload-url — request presigned URL
router.post("/upload-url", async (req: Request, res: Response) => {
  const projectId = Number((req.params as Record<string, string>).id);
  if (!projectId) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const { name } = req.body as {
    name?: string;
    size?: number;
    contentType?: string;
  };
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const uploadURL = await storageService.getObjectEntityUploadURL();
  const objectPath = storageService.normalizeObjectEntityPath(
    uploadURL.split("?")[0],
  );

  res.json({ uploadURL, objectPath });
});

// POST /api/projects/:id/storage — register an uploaded object in the DB
router.post("/", async (req: Request, res: Response) => {
  const projectId = Number((req.params as Record<string, string>).id);
  if (!projectId) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const { name, objectPath, contentType, size } = req.body as {
    name?: string;
    objectPath?: string;
    contentType?: string;
    size?: number;
  };
  if (!name || !objectPath) {
    res.status(400).json({ error: "name and objectPath are required" });
    return;
  }

  const [obj] = await db
    .insert(projectStorageObjectsTable)
    .values({
      projectId,
      name,
      objectPath,
      contentType: contentType || "application/octet-stream",
      size: size || 0,
    })
    .returning();

  res.status(201).json({ object: obj });
});

// DELETE /api/projects/:id/storage/:objectId
router.delete("/:objectId", async (req: Request, res: Response) => {
  const params = req.params as Record<string, string>;
  const projectId = Number(params.id);
  const objectId = Number(params.objectId);
  if (!projectId || !objectId) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  const [obj] = await db
    .select()
    .from(projectStorageObjectsTable)
    .where(
      and(
        eq(projectStorageObjectsTable.id, objectId),
        eq(projectStorageObjectsTable.projectId, projectId),
      ),
    );

  if (!obj) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  await db
    .delete(projectStorageObjectsTable)
    .where(eq(projectStorageObjectsTable.id, objectId));

  res.json({ ok: true });
});

// GET /api/projects/:id/storage/serve/:objectId — proxy the object content
router.get("/serve/:objectId", async (req: Request, res: Response) => {
  const params = req.params as Record<string, string>;
  const projectId = Number(params.id);
  const objectId = Number(params.objectId);
  if (!projectId || !objectId) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  const [obj] = await db
    .select()
    .from(projectStorageObjectsTable)
    .where(
      and(
        eq(projectStorageObjectsTable.id, objectId),
        eq(projectStorageObjectsTable.projectId, projectId),
      ),
    );

  if (!obj) {
    res.status(404).json({ error: "Object not found" });
    return;
  }

  try {
    const file = await storageService.getObjectEntityFile(obj.objectPath);
    const response = await storageService.downloadObject(file);
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "File not found in storage" });
      return;
    }
    throw err;
  }
});

export default router;
