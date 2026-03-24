import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, pool, projectDatabasesTable, projectsTable } from "@workspace/db";

const router = Router({ mergeParams: true });

const BLOCKED_SQL_PATTERNS = [
  /\bSET\s+search_path\b/i,
  /\bDROP\s+(TABLE|SCHEMA|DATABASE|INDEX|VIEW|FUNCTION|PROCEDURE)\b/i,
  /\bALTER\s+(TABLE|SCHEMA|DATABASE)\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\s+(SCHEMA|DATABASE)\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCOPY\b/i,
  /\\\!/i,
];

async function requireProjectOwner(
  req: Request,
  res: Response,
  projectId: number,
): Promise<boolean> {
  if (!req.user) {
    res.status(401).json({ error: "לא מחובר" });
    return false;
  }
  const [project] = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "פרויקט לא נמצא" });
    return false;
  }
  if (project.userId !== req.user.id) {
    res.status(403).json({ error: "אין הרשאה" });
    return false;
  }
  return true;
}

router.get("/:id/db/status", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireProjectOwner(req, res, projectId))) return;
  const [entry] = await db
    .select()
    .from(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, projectId));
  if (!entry) {
    res.json({ exists: false });
    return;
  }
  res.json({
    exists: true,
    schemaName: entry.schemaName,
    status: entry.status,
  });
});

router.post("/:id/db/provision", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireProjectOwner(req, res, projectId))) return;

  const [existing] = await db
    .select()
    .from(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, projectId));
  const schemaName = `project_${projectId}`;
  if (!existing) {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await db
      .insert(projectDatabasesTable)
      .values({ projectId, schemaName, status: "ready" });
  }
  res.json({ schemaName: existing?.schemaName ?? schemaName });
});

router.get("/:id/db/tables", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireProjectOwner(req, res, projectId))) return;
  const [entry] = await db
    .select()
    .from(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, projectId));
  if (!entry) {
    res.json({ tables: [] });
    return;
  }
  const tableRows = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
    [entry.schemaName],
  );
  const tables = await Promise.all(
    (tableRows.rows as { table_name: string }[]).map(async ({ table_name }) => {
      const cols = await pool.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
        [entry.schemaName, table_name],
      );
      return {
        name: table_name,
        columns: (
          cols.rows as {
            column_name: string;
            data_type: string;
            is_nullable: string;
          }[]
        ).map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === "YES",
        })),
      };
    }),
  );
  res.json({ tables });
});

router.post("/:id/db/query", async (req, res) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  if (!(await requireProjectOwner(req, res, projectId))) return;

  const { sql: sqlQuery } = req.body as { sql: string };
  if (!sqlQuery?.trim()) {
    res.status(400).json({ error: "sql required" });
    return;
  }

  for (const pattern of BLOCKED_SQL_PATTERNS) {
    if (pattern.test(sqlQuery)) {
      res.status(400).json({ error: "פעולה זו אינה מורשית" });
      return;
    }
  }

  const [entry] = await db
    .select()
    .from(projectDatabasesTable)
    .where(eq(projectDatabasesTable.projectId, projectId));
  if (!entry) {
    res.status(404).json({ error: "No database for this project" });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL search_path TO "${entry.schemaName}"`);
    const result = await client.query(sqlQuery);
    res.json({ rows: result.rows ?? [], rowCount: result.rowCount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: msg });
  } finally {
    client.release();
  }
});

export default router;
