/**
 * Deploy Domain
 *
 * Core types and state machine for the deployment system.
 */

export type DeployProvider = "netlify" | "vercel" | "custom";
export type DeployStatus = "queued" | "building" | "live" | "failed" | "cancelled";

export interface DeployEntity {
  id: string;
  projectId: number;
  userId: string;
  provider: DeployProvider;
  status: DeployStatus;
  deployUrl?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface DeployRequest {
  projectId: number;
  userId: string;
  provider: DeployProvider;
  token: string;
}

/**
 * State machine transitions
 */
export const VALID_TRANSITIONS: Record<DeployStatus, DeployStatus[]> = {
  queued: ["building", "cancelled"],
  building: ["live", "failed"],
  live: [],
  failed: ["queued"],
  cancelled: [],
};

export function canTransition(from: DeployStatus, to: DeployStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: DeployStatus): boolean {
  return status === "live" || status === "failed" || status === "cancelled";
}
