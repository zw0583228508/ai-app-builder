/**
 * Messages router — aggregates list + send sub-routers.
 *
 * File layout:
 *   list.ts      — GET  /:id/messages (message history)
 *   send.ts      — POST /:id/messages (AI streaming)
 *   streaming.ts — createSseContext() SSE helper
 *   agent.ts     — runAgentAndDesignBrain() multi-agent pipeline
 */

import { Router } from "express";
import listRouter from "./list";
import sendRouter from "./send";

const router = Router({ mergeParams: true });

router.use("/", listRouter);
router.use("/", sendRouter);

export default router;
