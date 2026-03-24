import { logger } from "../lib/logger";

export type AuditAction =
  | "project.delete"
  | "project.create"
  | "deploy.trigger"
  | "deploy.success"
  | "deploy.failure"
  | "github.sync"
  | "share.create"
  | "share.revoke"
  | "secret.create"
  | "secret.delete"
  | "terminal.open"
  | "snapshot.restore";

export interface AuditEvent {
  action: AuditAction;
  userId: string | null;
  projectId?: number | string;
  meta?: Record<string, unknown>;
}

export function logAudit(event: AuditEvent): void {
  logger.info(
    {
      audit: true,
      action: event.action,
      userId: event.userId,
      projectId: event.projectId,
      ...event.meta,
    },
    `[Audit] ${event.action}`,
  );
}
