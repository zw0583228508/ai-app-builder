import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, projectSecretsTable } from "@workspace/db";
import { encrypt, decrypt } from "../../lib/encryption";

const router = Router({ mergeParams: true });

router.get("/:id/secrets", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select({
      id: projectSecretsTable.id,
      key: projectSecretsTable.key,
      environment: projectSecretsTable.environment,
      createdAt: projectSecretsTable.createdAt,
    })
    .from(projectSecretsTable)
    .where(eq(projectSecretsTable.projectId, projectId));
  res.json({ secrets: rows });
});

router.post("/:id/secrets", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const {
    key,
    value,
    environment = "dev",
  } = req.body as {
    key: string;
    value: string;
    environment?: string;
  };
  if (!key || !value) {
    res.status(400).json({ error: "key and value required" });
    return;
  }
  const encryptedValue = encrypt(value);
  const [secret] = await db
    .insert(projectSecretsTable)
    .values({ projectId, key, encryptedValue, environment })
    .onConflictDoUpdate({
      target: [
        projectSecretsTable.projectId,
        projectSecretsTable.key,
        projectSecretsTable.environment,
      ],
      set: { encryptedValue, updatedAt: new Date() },
    })
    .returning({
      id: projectSecretsTable.id,
      key: projectSecretsTable.key,
      environment: projectSecretsTable.environment,
      createdAt: projectSecretsTable.createdAt,
    });
  res.json({ secret });
});

router.delete("/:id/secrets/:secretId", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const secretId = parseInt(req.params.secretId);
  if (isNaN(projectId) || isNaN(secretId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(projectSecretsTable)
    .where(
      and(
        eq(projectSecretsTable.id, secretId),
        eq(projectSecretsTable.projectId, projectId),
      ),
    );
  res.json({ ok: true });
});

export { encrypt, decrypt };
export default router;
