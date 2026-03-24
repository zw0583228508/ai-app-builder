/**
 * Resource Policy
 *
 * Defines limits and port allocation for project runtimes.
 */

import {
  MAX_CONCURRENT_RUNTIMES,
  SandboxError,
} from "../sandbox/sandbox-policy.js";
import { runtimeRegistry } from "./runtime-registry.js";

const PORT_RANGE_START = Number(process.env.RUNTIME_PORT_START ?? "14000");
const PORT_RANGE_END = Number(process.env.RUNTIME_PORT_END ?? "14999");

const allocatedPorts = new Set<number>();

/**
 * Allocate a free port in the allowed range.
 * Returns the port number or throws if the range is exhausted.
 */
export function allocatePort(preferredPort?: number): number {
  if (preferredPort !== undefined) {
    if (
      preferredPort >= PORT_RANGE_START &&
      preferredPort <= PORT_RANGE_END &&
      !allocatedPorts.has(preferredPort)
    ) {
      allocatedPorts.add(preferredPort);
      return preferredPort;
    }
  }

  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!allocatedPorts.has(port)) {
      allocatedPorts.add(port);
      return port;
    }
  }

  throw new SandboxError(
    "runtime_error",
    `No free ports available in range ${PORT_RANGE_START}-${PORT_RANGE_END}`,
  );
}

export function releasePort(port: number): void {
  allocatedPorts.delete(port);
}

/**
 * Check whether we can start a new runtime without exceeding resource limits.
 * Throws SandboxError if limit is exceeded.
 */
export function assertRuntimeCapacity(): void {
  const running = runtimeRegistry.getAll().filter((r) => r.exitCode === null);

  if (running.length >= MAX_CONCURRENT_RUNTIMES) {
    throw new SandboxError(
      "runtime_error",
      `Maximum concurrent runtimes (${MAX_CONCURRENT_RUNTIMES}) reached. Stop an existing runtime before starting a new one.`,
    );
  }
}
