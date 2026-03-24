import type { Request, Response } from "express";

export interface SseContext {
  readonly sendEvent: (data: object) => void;
  readonly heartbeatInterval: ReturnType<typeof setInterval>;
  clientDisconnected: boolean;
}

/**
 * Sets up an SSE connection on res and returns a context object containing
 * the sendEvent helper, the heartbeat interval, and a mutable
 * clientDisconnected flag that is set to true when the client closes.
 */
export function createSseContext(req: Request, res: Response): SseContext {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const socket = res.socket;
  if (socket) socket.setNoDelay(true);

  const ctx: SseContext = {
    clientDisconnected: false,
    sendEvent: (data: object) => {
      if (!ctx.clientDisconnected)
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    heartbeatInterval: setInterval(() => {
      if (!ctx.clientDisconnected) res.write(": heartbeat\n\n");
    }, 15_000),
  };

  req.on("close", () => {
    ctx.clientDisconnected = true;
    clearInterval(ctx.heartbeatInterval);
  });

  return ctx;
}
