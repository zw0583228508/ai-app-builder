/**
 * messages/buildMemoryContext
 *
 * Builds the project DNA, user DNA, and scored memory-chunk context
 * strings that are injected into the AI system prompt before generation.
 *
 * Extracted from messages.ts (Phase 1 modularization).
 */

import { db, userDnaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getProjectDNA,
  buildDNAContext,
  buildUserDNAContext,
  scoreMemoryChunks,
  buildMemoryChunkContext,
} from "../memory/project-dna";
import type { MemoryChunk } from "../memory/project-dna";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface MemoryContext {
  dnaContext: string;
  userDnaContext: string;
  memoryChunkContext: string;
  projectDna: Awaited<ReturnType<typeof getProjectDNA>>;
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────

/**
 * Fetch and build all memory/DNA context strings for a project + user.
 *
 * Runs all DB fetches in parallel.
 *
 * @param projectId    The numeric project ID
 * @param userId       The user's ID (may be null for anonymous projects)
 * @param userMessage  The current user message (used to score memory chunks)
 * @param currentMode  The resolved user skill mode (builder / developer / etc.)
 */
export async function buildFullMemoryContext(params: {
  projectId: number;
  userId: string | null;
  userMessage: string;
  currentMode: string;
}): Promise<MemoryContext> {
  const { projectId, userId, userMessage, currentMode } = params;

  const [projectDna, userDnaRows] = await Promise.all([
    getProjectDNA(projectId),
    userId
      ? db
          .select()
          .from(userDnaTable)
          .where(eq(userDnaTable.userId, userId))
          .catch(() => [] as (typeof userDnaTable.$inferSelect)[])
      : Promise.resolve([] as (typeof userDnaTable.$inferSelect)[]),
  ]);

  const dnaContext = buildDNAContext(projectDna, currentMode);
  const [userDna] = userDnaRows;
  const userDnaContext = buildUserDNAContext(userDna ?? null);

  const rawChunks = (projectDna?.memoryChunks as MemoryChunk[] | null) ?? [];
  const relevantChunks = scoreMemoryChunks(rawChunks, userMessage);
  const memoryChunkContext = buildMemoryChunkContext(relevantChunks);

  return { dnaContext, userDnaContext, memoryChunkContext, projectDna };
}
