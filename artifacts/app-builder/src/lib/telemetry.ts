/**
 * Lightweight product telemetry — Phase 14.
 * Tracks quality signals: stream errors, preview updates, deploy attempts, paste success.
 * Fire-and-forget: never blocks the user, never throws.
 */

type EventName =
  | "stream_complete"
  | "stream_error"
  | "stream_stopped"
  | "preview_updated"
  | "deploy_attempted"
  | "paste_success"
  | "retry_triggered"
  | "attachment_added";

interface EventPayload {
  name: EventName;
  mode?: string;
  errorType?: string;
  linesGenerated?: number;
  durationMs?: number;
  [key: string]: unknown;
}

const isDev = import.meta.env.DEV;

export function logEvent(payload: EventPayload): void {
  if (isDev) {
    // In dev: just log so the team can see the signals during development
    console.debug("[telemetry]", payload.name, payload);
    return;
  }
  // In prod: fire-and-forget via sendBeacon (doesn't block page unload)
  try {
    const body = JSON.stringify({ ...payload, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      // Fallback: low-priority fetch
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never surface telemetry failures to the user
  }
}

/** Track stream completion with optional quality metrics */
export function trackStreamComplete(
  mode: string,
  linesGenerated: number,
  durationMs: number,
) {
  logEvent({ name: "stream_complete", mode, linesGenerated, durationMs });
}

/** Track stream errors with category */
export function trackStreamError(
  mode: string,
  errorType: "rate_limit" | "network" | "auth" | "timeout" | "unknown",
) {
  logEvent({ name: "stream_error", mode, errorType });
}

/** Track when user retries after a stream error */
export function trackRetry(mode: string) {
  logEvent({ name: "retry_triggered", mode });
}

/** Track when preview successfully updates after a build */
export function trackPreviewUpdated(projectId: number) {
  logEvent({ name: "preview_updated", projectId });
}

/** Track deploy attempts */
export function trackDeployAttempted(mode: string) {
  logEvent({ name: "deploy_attempted", mode });
}

/** Track paste of image into chat */
export function trackPasteSuccess(fileCount: number) {
  logEvent({ name: "paste_success", fileCount });
}

/** Track file attachment added via file picker */
export function trackAttachmentAdded(fileCount: number) {
  logEvent({ name: "attachment_added", fileCount });
}
