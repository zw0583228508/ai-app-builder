import { eq, and } from "drizzle-orm";
import { db, projectSecretsTable } from "@workspace/db";
import { decrypt } from "../../lib/encryption";

export async function getProjectSecretKeys(
  projectId: number,
  environment = "dev",
): Promise<string[]> {
  const rows = await db
    .select({ key: projectSecretsTable.key })
    .from(projectSecretsTable)
    .where(
      and(
        eq(projectSecretsTable.projectId, projectId),
        eq(projectSecretsTable.environment, environment),
      ),
    );
  return rows.map((r) => r.key);
}

export async function getProjectSecrets(
  projectId: number,
  environment = "dev",
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      key: projectSecretsTable.key,
      encryptedValue: projectSecretsTable.encryptedValue,
    })
    .from(projectSecretsTable)
    .where(
      and(
        eq(projectSecretsTable.projectId, projectId),
        eq(projectSecretsTable.environment, environment),
      ),
    );
  return Object.fromEntries(
    rows.map((r) => [r.key, decrypt(r.encryptedValue)]),
  );
}
