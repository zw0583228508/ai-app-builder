/**
 * useIntegrations — Secure Integration Status Hook
 *
 * SECURITY INVARIANT (must never be violated):
 *   Raw credential values (API keys, tokens, URIs, secrets) are NEVER stored
 *   in React state, module-level variables, or any client-side runtime memory
 *   after the initial save request completes.
 *
 * What IS stored client-side:
 *   - provider name
 *   - connected: boolean
 *   - status: "active" | "inactive" | "revoked" | "error"
 *
 * What is NEVER stored client-side after save:
 *   - actual key/token/secret values
 */
import { useState, useCallback, useEffect } from "react";

export interface IntegrationStatus {
  provider: string;
  connected: boolean;
  status: string;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/**
 * Module-level capability cache — booleans only, no credential values.
 * Safe to read synchronously anywhere in the app.
 */
let _cachedCapabilities: Record<string, boolean> = {};

/** Synchronous read of connection capabilities — safe to call outside React hooks */
export function readCapabilities(): Record<string, boolean> {
  return _cachedCapabilities;
}

async function fetchServerStatuses(): Promise<
  Record<string, IntegrationStatus>
> {
  try {
    const res = await fetch(`${API_BASE}/api/user/integrations`, {
      credentials: "include",
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      integrations?: Record<string, { connected: boolean; status: string }>;
    };
    const result: Record<string, IntegrationStatus> = {};
    for (const [provider, info] of Object.entries(data.integrations ?? {})) {
      result[provider] = {
        provider,
        connected: info.connected,
        status: info.status,
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function useIntegrations() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>(
    {},
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchServerStatuses().then((data) => {
      // Build capability cache from status data (booleans only)
      const caps: Record<string, boolean> = {};
      for (const [provider, s] of Object.entries(data)) {
        caps[provider] = s.connected;
      }
      _cachedCapabilities = caps;
      setStatuses(data);
      setLoaded(true);
    });
  }, []);

  /**
   * Save credentials to the encrypted server vault.
   * Contract: POST /api/integrations/:provider/save with { secrets: {...} }
   * The credential values are sent once and then immediately discarded —
   * they are NEVER stored in React state or module-level variables.
   */
  const saveCredential = useCallback(
    async (provider: string, secrets: Record<string, string>) => {
      try {
        const res = await fetch(
          `${API_BASE}/api/integrations/${encodeURIComponent(provider)}/save`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ secrets }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          console.error(
            "[integrations] save failed:",
            body.error ?? res.status,
          );
          return;
        }
        // After save: mark as connected in local state — NEVER store actual values
        _cachedCapabilities = { ..._cachedCapabilities, [provider]: true };
        setStatuses((prev) => ({
          ...prev,
          [provider]: { provider, connected: true, status: "active" },
        }));
      } catch {
        // silently ignore — server sync is best-effort
      }
    },
    [],
  );

  /**
   * Remove an integration from the vault (soft-revoke).
   * Contract: DELETE /api/integrations/:provider/revoke
   */
  const removeCredential = useCallback(async (provider: string) => {
    try {
      await fetch(
        `${API_BASE}/api/integrations/${encodeURIComponent(provider)}/revoke`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      _cachedCapabilities = { ..._cachedCapabilities, [provider]: false };
      setStatuses((prev) => ({
        ...prev,
        [provider]: { provider, connected: false, status: "inactive" },
      }));
    } catch {
      // silently ignore
    }
  }, []);

  const getActiveIntegrations = useCallback(() => {
    return Object.fromEntries(
      Object.entries(statuses)
        .filter(([, s]) => s.connected)
        .map(([provider]) => [provider, true]),
    );
  }, [statuses]);

  return {
    statuses,
    saveCredential,
    removeCredential,
    getActiveIntegrations,
    loaded,
  };
}
