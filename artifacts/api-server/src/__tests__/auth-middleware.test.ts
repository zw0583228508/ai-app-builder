import { describe, it, expect, vi, beforeEach } from "vitest";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import request from "supertest";

vi.mock("@workspace/db", () => ({
  db: {},
  sessionsTable: {},
}));

vi.mock("../lib/auth", async () => {
  return {
    SESSION_COOKIE: "sid",
    SESSION_TTL: 604800000,
    OIDC_COOKIE_TTL: 600000,
    getSessionId: (req: Request): string | undefined => {
      const authHeader = req.headers["authorization"];
      if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
      return req.cookies?.["sid"];
    },
    getSession: vi.fn(),
    clearSession: vi.fn(),
    updateSession: vi.fn(),
    getOidcConfig: vi.fn(),
    invalidateOidcConfig: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
  };
});

import { getSession, clearSession } from "../lib/auth";
import { authMiddleware } from "../middlewares/authMiddleware";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next();
  });
  app.use(authMiddleware);
  app.get("/api/protected", (req: Request, res: Response) => {
    res.json({ userId: req.user?.id ?? null });
  });
  return app;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clearSession).mockResolvedValue(undefined);
  });

  it("sets userId to null when no session cookie or header", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const app = makeApp();
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });

  it("attaches user when session is valid", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user-123", email: "test@test.com" },
      access_token: "token",
      expires_at: Date.now() + 3600_000,
    } as any);
    const app = makeApp();
    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", "Bearer valid-sid");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-123");
  });

  it("returns null user when session lookup returns null (expired)", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const app = makeApp();
    const res = await request(app)
      .get("/api/protected")
      .set("Authorization", "Bearer expired-sid");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeNull();
  });

  it("does not call getSession when no sid is present", async () => {
    const app = makeApp();
    await request(app).get("/api/protected");
    expect(vi.mocked(getSession)).not.toHaveBeenCalled();
  });
});
