import PQueue from "p-queue";
import { logger } from "./logger";

const deployQueue = new PQueue({ concurrency: 3 });

export function queueDeploy(fn: () => Promise<void>): Promise<void> {
  logger.info(
    { pending: deployQueue.pending, size: deployQueue.size },
    "[DeployQueue] Adding job",
  );
  return deployQueue.add(fn) as Promise<void>;
}

export function getQueueStatus() {
  return {
    pending: deployQueue.pending,
    size: deployQueue.size,
    isPaused: deployQueue.isPaused,
  };
}

export async function waitForQueueIdle() {
  return deployQueue.onIdle();
}
