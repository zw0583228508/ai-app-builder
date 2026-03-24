/**
 * Project Domain
 *
 * Core types, entities, and business rules for the Project domain.
 * This layer is DB-agnostic — it describes what a project IS, not how it's stored.
 */

export type ProjectType =
  | "website"
  | "webapp"
  | "landing"
  | "portfolio"
  | "mobile"
  | "saas";
export type ProjectStack =
  | "html"
  | "react"
  | "nextjs"
  | "vue"
  | "svelte"
  | "django";
export type UserMode = "entrepreneur" | "builder" | "developer" | "maker";

export interface ProjectEntity {
  id: number;
  title: string;
  description: string | null;
  type: ProjectType;
  stack: ProjectStack;
  userMode: UserMode;
  previewHtml: string | null;
  deploymentUrl: string | null;
  userId: string | null;
  shareToken: string | null;
  customSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProjectWithMessages extends ProjectEntity {
  messages: Array<{
    id: number;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

/**
 * Business rules
 */
export function isProjectOwner(
  project: Pick<ProjectEntity, "userId">,
  userId: string | undefined,
): boolean {
  if (!project.userId) return true; // Anonymous project
  if (!userId) return false;
  return project.userId === userId;
}

export function canShareProject(
  project: Pick<ProjectEntity, "previewHtml" | "stack">,
): boolean {
  if (project.previewHtml) return true;
  if (project.stack === "react" || project.stack === "nextjs") return true;
  return false;
}

export function isReactProject(project: Pick<ProjectEntity, "stack">): boolean {
  return project.stack === "react" || project.stack === "nextjs";
}

export function slugify(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return suffix ? `${base}-${suffix}` : base;
}
