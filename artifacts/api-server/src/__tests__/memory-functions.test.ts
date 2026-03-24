import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {},
  projectDnaTable: {},
  projectMessagesTable: {},
  projectSnapshotsTable: {},
  projectFilesTable: {},
}));

import {
  scoreMemoryChunks,
  buildMemoryChunkContext,
  buildDNAContext,
} from "../services/memory/project-dna";
import type { MemoryChunk } from "../services/memory/project-dna";

const makeChunk = (overrides: {
  content: string;
  keywords: string[];
  importance?: number;
  createdAt?: string;
}): MemoryChunk => ({
  content: overrides.content,
  keywords: overrides.keywords,
  importance: overrides.importance ?? 3,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
});

describe("scoreMemoryChunks", () => {
  it("ranks chunks with matching keywords higher", () => {
    const chunks: MemoryChunk[] = [
      makeChunk({ content: "Use dark theme", keywords: ["dark", "theme"] }),
      makeChunk({
        content: "Use sans-serif font",
        keywords: ["font", "serif"],
      }),
    ];
    const ranked = scoreMemoryChunks(chunks, "I want a dark background");
    expect(ranked[0].content).toBe("Use dark theme");
  });

  it("returns at most 5 chunks", () => {
    const chunks: MemoryChunk[] = Array.from({ length: 10 }, (_, i) =>
      makeChunk({ content: `chunk ${i}`, keywords: [] }),
    );
    const ranked = scoreMemoryChunks(chunks, "hello");
    expect(ranked.length).toBeLessThanOrEqual(5);
  });

  it("returns empty array for empty input", () => {
    expect(scoreMemoryChunks([], "test")).toEqual([]);
  });

  it("prefers high-importance chunks when no keywords match", () => {
    const chunks: MemoryChunk[] = [
      makeChunk({ content: "low importance", keywords: [], importance: 1 }),
      makeChunk({ content: "high importance", keywords: [], importance: 5 }),
    ];
    const ranked = scoreMemoryChunks(chunks, "unrelated query");
    expect(ranked[0].content).toBe("high importance");
  });

  it("is case-insensitive for keyword matching", () => {
    const chunks: MemoryChunk[] = [
      makeChunk({ content: "Use Bootstrap", keywords: ["Bootstrap"] }),
    ];
    const ranked = scoreMemoryChunks(chunks, "add bootstrap grid");
    expect(ranked[0].content).toBe("Use Bootstrap");
  });
});

describe("buildMemoryChunkContext", () => {
  it("returns empty string for empty chunks array", () => {
    expect(buildMemoryChunkContext([])).toBe("");
  });

  it("includes all chunk contents in output", () => {
    const chunks: MemoryChunk[] = [
      makeChunk({ content: "Use Tailwind CSS", keywords: [] }),
      makeChunk({ content: "React with TypeScript", keywords: [] }),
    ];
    const ctx = buildMemoryChunkContext(chunks);
    expect(ctx).toContain("Use Tailwind CSS");
    expect(ctx).toContain("React with TypeScript");
  });

  it("includes the section header", () => {
    const chunks: MemoryChunk[] = [
      makeChunk({ content: "decision A", keywords: [] }),
    ];
    const ctx = buildMemoryChunkContext(chunks);
    expect(ctx).toContain("RELEVANT PAST DECISIONS");
  });
});

describe("buildDNAContext", () => {
  it("returns empty string for null DNA", () => {
    expect(buildDNAContext(null, "maker")).toBe("");
  });

  it("returns empty string when DNA has no relevant fields (maker mode)", () => {
    const emptyDna = {
      id: 1,
      projectId: "x",
      interests: [],
      techCuriosity: [],
      projectVibe: null,
      visualStyle: null,
      businessModel: null,
      targetAudience: null,
      primaryGoal: null,
      brandColors: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    expect(buildDNAContext(emptyDna, "maker")).toBe("");
  });

  it("includes vibe in maker mode context", () => {
    const dna = {
      id: 1,
      projectId: "x",
      interests: ["music", "art"],
      techCuriosity: ["WebGL"],
      projectVibe: "Futuristic and bold",
      visualStyle: "dark-neon",
      businessModel: null,
      targetAudience: null,
      primaryGoal: null,
      brandColors: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    const ctx = buildDNAContext(dna, "maker");
    expect(ctx).toContain("Futuristic and bold");
    expect(ctx).toContain("music, art");
  });

  it("includes domain context in developer mode", () => {
    const dna = {
      id: 1,
      projectId: "x",
      interests: [],
      techCuriosity: [],
      projectVibe: null,
      visualStyle: null,
      businessModel: "saas",
      targetAudience: "startups",
      primaryGoal: "onboarding flow",
      brandColors: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    const ctx = buildDNAContext(dna, "developer");
    expect(ctx).toContain("startups");
    expect(ctx).toContain("onboarding flow");
  });
});
