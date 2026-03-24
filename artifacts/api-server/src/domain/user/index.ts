/**
 * User Domain
 *
 * Core types and business rules for the User domain.
 */

export interface UserEntity {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface UserDNAEntity {
  userId: string;
  skillLevel: "beginner" | "intermediate" | "expert" | null;
  communicationStyle: string | null;
  lastActiveMode: string | null;
  integrations: Record<string, unknown> | null;
  frameworkPreferences: Record<string, unknown> | null;
  designPreferences: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isAuthenticated(userId: string | undefined): userId is string {
  return typeof userId === "string" && userId.length > 0;
}

export function inferSkillLevel(
  userMode: string,
): "beginner" | "intermediate" | "expert" {
  switch (userMode) {
    case "developer":
      return "expert";
    case "builder":
      return "intermediate";
    case "maker":
      return "intermediate";
    case "entrepreneur":
      return "beginner";
    default:
      return "beginner";
  }
}
