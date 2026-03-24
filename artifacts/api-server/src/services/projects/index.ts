/**
 * Projects Service
 *
 * Business logic for project CRUD operations.
 * Route handlers call these — not DB directly.
 */

import { eq, and, isNull, asc } from "drizzle-orm";
import { db, projectsTable, projectMessagesTable } from "@workspace/db";

export type { Project } from "@workspace/db";

export async function getProjectsByUser(userId: string) {
  return db
    .select()
    .from(projectsTable)
    .where(
      and(eq(projectsTable.userId, userId), isNull(projectsTable.deletedAt)),
    )
    .orderBy(asc(projectsTable.createdAt));
}

export async function getProjectById(id: number) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  return project ?? null;
}

export async function getProjectWithMessages(id: number) {
  const project = await getProjectById(id);
  if (!project) return null;
  const messages = await db
    .select()
    .from(projectMessagesTable)
    .where(eq(projectMessagesTable.projectId, id))
    .orderBy(asc(projectMessagesTable.createdAt));
  return { ...project, messages };
}

export async function createProject(data: {
  title: string;
  description?: string | null;
  type: string;
  stack: string;
  userMode?: string;
  userId?: string;
}) {
  const [project] = await db
    .insert(projectsTable)
    .values({
      title: data.title,
      description: data.description,
      type: data.type,
      stack: data.stack,
      userMode: (data.userMode ?? "entrepreneur") as
        | "entrepreneur"
        | "builder"
        | "developer"
        | "maker",
      userId: data.userId,
    })
    .returning();
  return project;
}

export async function softDeleteProject(id: number): Promise<void> {
  await db
    .update(projectsTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projectsTable.id, id));
}

export async function updateProjectMode(id: number, userMode: string) {
  const [updated] = await db
    .update(projectsTable)
    .set({
      userMode: userMode as "entrepreneur" | "builder" | "developer" | "maker",
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, id))
    .returning();
  return updated;
}
