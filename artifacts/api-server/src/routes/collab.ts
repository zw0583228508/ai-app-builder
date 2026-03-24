import type { WebSocket } from "ws";
import { logger } from "../lib/logger";
import { getSession } from "../lib/auth";
import { db, projectsTable } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

interface CollabClient {
  ws: WebSocket;
  projectId: string;
  clientId: string;
  color: string;
  name: string;
  joinedAt: number;
  cursor?: { line: number; col: number; file: string };
}

const COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#3b82f6",
];

const clients = new Map<string, Set<CollabClient>>();

function getRoom(projectId: string): Set<CollabClient> {
  if (!clients.has(projectId)) clients.set(projectId, new Set());
  return clients.get(projectId)!;
}

export function getViewerCount(projectId: string): number {
  return clients.get(projectId)?.size ?? 0;
}

export function broadcastProjectUpdate(projectId: string, payload: object) {
  const room = clients.get(projectId);
  if (!room || room.size === 0) return;
  const msg = JSON.stringify({
    type: "project-updated",
    projectId,
    ...payload,
  });
  for (const client of room) {
    if (client.ws.readyState === 1) client.ws.send(msg);
  }
}

function broadcastPresence(projectId: string, sender?: CollabClient) {
  const room = clients.get(projectId);
  if (!room) return;
  const count = room.size;
  const cursors = Array.from(room)
    .filter((c) => c.cursor)
    .map((c) => ({
      clientId: c.clientId,
      color: c.color,
      name: c.name,
      ...c.cursor,
    }));
  const msg = JSON.stringify({
    type: "presence",
    projectId,
    viewerCount: count,
    cursors,
  });
  for (const client of room) {
    if (client.ws.readyState === 1) client.ws.send(msg);
  }
}

export async function handleCollabWs(
  ws: WebSocket,
  req: import("http").IncomingMessage,
) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const projectId = url.searchParams.get("projectId");

  if (!projectId) {
    ws.close(4000, "projectId required");
    return;
  }

  // ── Auth check: support both cookie and Bearer token ────────────────
  const cookieHeader = req.headers.cookie ?? "";
  const sidFromCookie = cookieHeader.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
  const authHeader = req.headers["authorization"] as string | undefined;
  const sidFromBearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const sid = sidFromCookie ?? sidFromBearer;
  if (!sid) {
    ws.close(4001, "Unauthorized");
    return;
  }
  const session = await getSession(sid).catch(() => null);
  if (!session?.user?.id) {
    ws.close(4001, "Unauthorized");
    return;
  }
  // Verify caller owns the project — numeric ID is required, non-numeric is rejected
  const numericId = Number(projectId);
  if (isNaN(numericId) || numericId <= 0) {
    ws.close(4003, "Forbidden");
    return;
  }
  const [proj] = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(
      and(eq(projectsTable.id, numericId), isNull(projectsTable.deletedAt)),
    );
  if (!proj || proj.userId !== session.user.id) {
    ws.close(4003, "Forbidden");
    return;
  }

  const room = getRoom(projectId);
  const clientId = Math.random().toString(36).slice(2);
  const color = COLORS[room.size % COLORS.length];
  const name = url.searchParams.get("name") || `משתמש ${room.size + 1}`;

  const client: CollabClient = {
    ws,
    projectId,
    clientId,
    color,
    name,
    joinedAt: Date.now(),
  };
  room.add(client);

  logger.info({ projectId, viewers: room.size }, "Collab client joined");

  // Send current viewer count + cursors to new joiner
  const cursors = Array.from(room)
    .filter((c) => c.cursor && c !== client)
    .map((c) => ({
      clientId: c.clientId,
      color: c.color,
      name: c.name,
      ...c.cursor,
    }));
  ws.send(
    JSON.stringify({
      type: "presence",
      projectId,
      viewerCount: room.size,
      cursors,
      yourClientId: clientId,
      yourColor: color,
    }),
  );
  broadcastPresence(projectId, client);

  // ── Heartbeat — detect dead connections every 30s ─────────────────────────
  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
      room.delete(client);
      if (room.size === 0) clients.delete(projectId);
      else broadcastPresence(projectId);
    }
  }, 30_000);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as {
        type: string;
        line?: number;
        col?: number;
        file?: string;
      };
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      } else if (msg.type === "cursor") {
        client.cursor = {
          line: msg.line ?? 0,
          col: msg.col ?? 0,
          file: msg.file ?? "",
        };
        // Broadcast cursor to all others in room
        const cursorMsg = JSON.stringify({
          type: "cursor",
          clientId,
          color,
          name,
          line: client.cursor.line,
          col: client.cursor.col,
          file: client.cursor.file,
        });
        for (const other of room) {
          if (other !== client && other.ws.readyState === 1)
            other.ws.send(cursorMsg);
        }
      }
    } catch {
      // ignore malformed
    }
  });

  ws.on("close", () => {
    clearInterval(heartbeat);
    room.delete(client);
    if (room.size === 0) clients.delete(projectId);
    else {
      // Notify others that this cursor is gone
      const leaveMsg = JSON.stringify({ type: "cursor-leave", clientId });
      for (const other of room) {
        if (other.ws.readyState === 1) other.ws.send(leaveMsg);
      }
      broadcastPresence(projectId);
    }
    logger.info({ projectId, viewers: room.size }, "Collab client left");
  });

  ws.on("error", () => {
    clearInterval(heartbeat);
    room.delete(client);
    if (room.size === 0) clients.delete(projectId);
  });
}
