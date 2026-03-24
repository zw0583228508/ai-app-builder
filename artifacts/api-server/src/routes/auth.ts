import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

// ── Server-side OIDC state store ───────────────────────────────────────────
// Eliminates the need for SameSite cookies during the OIDC flow.
// State is keyed by the random `state` parameter; entries expire after 10 min.
interface OidcStateEntry {
  codeVerifier: string;
  nonce: string;
  returnTo: string;
  expiresAt: number;
}
const oidcStateStore = new Map<string, OidcStateEntry>();

// Purge expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of oidcStateStore) {
    if (v.expiresAt < now) oidcStateStore.delete(k);
  }
}, 60_000);

// ── Cookie helpers ─────────────────────────────────────────────────────────
// In development the preview runs inside a Replit iframe (replit.com embedding
// a replit.dev origin).  SameSite:"strict" or "lax" blocks the cookie in that
// cross-site iframe context, so we downgrade to "none" (still Secure) in dev.
const isDev = process.env["NODE_ENV"] !== "production";

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: isDev ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

async function upsertUser(data: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}) {
  const [user] = await db
    .insert(usersTable)
    .values(data)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return user;
}

// ── Google OAuth configuration ─────────────────────────────────────────────
let googleConfig: oidc.Configuration | null = null;

async function getGoogleConfig(): Promise<oidc.Configuration> {
  if (!googleConfig) {
    googleConfig = await oidc.discovery(
      new URL("https://accounts.google.com"),
      process.env["GOOGLE_CLIENT_ID"]!,
      process.env["GOOGLE_CLIENT_SECRET"],
    );
  }
  return googleConfig;
}

function hasGoogleCredentials(): boolean {
  return !!(
    process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]
  );
}

// ── Current user ───────────────────────────────────────────────────────────
router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

// Returns which providers are configured (used by login page)
router.get("/auth/providers", (_req: Request, res: Response) => {
  res.json({ google: hasGoogleCredentials() });
});

// ── Dev-only login bypass ──────────────────────────────────────────────────
// In the Replit workspace, OIDC is broken in the preview iframe.
// This endpoint creates a session using REPL_ID directly.
// NEVER reachable in production (NODE_ENV=production blocks it entirely).
router.get("/dev-login", async (req: Request, res: Response) => {
  if (process.env["NODE_ENV"] === "production") {
    res.status(404).send("Not found");
    return;
  }

  const replId = process.env["REPL_ID"];
  if (!replId) {
    res.status(400).send("REPL_ID not set");
    return;
  }

  const userId = `dev-${replId}`;
  const userData = {
    id: userId,
    email: `dev@${replId}.replit.dev`,
    firstName: "Developer",
    lastName: null,
    profileImageUrl: null,
  };

  await upsertUser(userData);

  const sessionData: SessionData = {
    user: userData,
    access_token: "dev-token",
    refresh_token: undefined,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL / 1000,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  const returnTo = getSafeReturnTo(req.query.returnTo);
  res.redirect(returnTo);
});

// ── Google OAuth 2.0 ───────────────────────────────────────────────────────
router.get("/auth/google", async (req: Request, res: Response) => {
  if (!hasGoogleCredentials()) {
    res.redirect("/login?error=not_configured");
    return;
  }

  const config = await getGoogleConfig();
  const callbackUrl = `${getOrigin(req)}/api/auth/google/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  oidcStateStore.set(state, {
    codeVerifier,
    nonce,
    returnTo,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  res.redirect(redirectTo.href);
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  if (!hasGoogleCredentials()) {
    res.redirect("/login?error=not_configured");
    return;
  }

  const config = await getGoogleConfig();
  const callbackUrl = `${getOrigin(req)}/api/auth/google/callback`;

  const returnedState = req.query["state"] as string | undefined;
  const stateEntry = returnedState
    ? oidcStateStore.get(returnedState)
    : undefined;

  if (!stateEntry || stateEntry.expiresAt < Date.now()) {
    res.redirect("/login?error=invalid_state");
    return;
  }

  oidcStateStore.delete(returnedState!);
  const { codeVerifier, nonce, returnTo } = stateEntry;

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState: returnedState,
      idTokenExpected: true,
    });
  } catch (err) {
    console.error("Google OAuth token exchange failed:", err);
    res.redirect("/login?error=token_exchange_failed");
    return;
  }

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/login?error=no_claims");
    return;
  }

  const dbUser = await upsertUser({
    id: claims.sub,
    email: (claims["email"] as string) || null,
    firstName: (claims["given_name"] as string) || null,
    lastName: (claims["family_name"] as string) || null,
    profileImageUrl: (claims["picture"] as string) || null,
  });

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : undefined,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(getSafeReturnTo(returnTo));
});

// ── Replit OIDC (kept as fallback) ────────────────────────────────────────
router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  oidcStateStore.set(state, {
    codeVerifier,
    nonce,
    returnTo,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnedState = req.query["state"] as string | undefined;
  const stateEntry = returnedState
    ? oidcStateStore.get(returnedState)
    : undefined;

  if (!stateEntry || stateEntry.expiresAt < Date.now()) {
    res.redirect("/api/login");
    return;
  }

  oidcStateStore.delete(returnedState!);
  const { codeVerifier, nonce, returnTo } = stateEntry;

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState: returnedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser({
    id: claims.sub,
    email: (claims["email"] as string) || null,
    firstName: (claims["first_name"] as string) || null,
    lastName: (claims["last_name"] as string) || null,
    profileImageUrl:
      (claims["profile_image_url"] as string) ||
      (claims["picture"] as string) ||
      null,
  });

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(getSafeReturnTo(returnTo));
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

export default router;
