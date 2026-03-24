import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import proxyRouter from "./proxy";
import teamsRouter from "./teams";
import templatesRouter from "./templates";
import insightsRouter from "./analytics/insights";
import whatsappRouter from "./whatsapp";
import userDnaRouter from "./user-dna";
import runtimeRouter from "./runtime";
import jobsRouter from "./jobs";
import ogImageRouter from "./og-image";
import subscriptionsRouter from "./subscriptions";
import userIntegrationsRouter from "./user-integrations";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

// ── CSRF token (double-submit cookie pattern) ───────────────────────────────
router.get("/csrf-token", (req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString("hex");
  const isProdCtx = process.env.NODE_ENV === "production";
  res.cookie("csrf-token", token, {
    httpOnly: false,
    sameSite: isProdCtx ? "lax" : "none",
    secure: true,
    maxAge: 3_600_000,
  });
  res.json({ token });
});

router.use(healthRouter);
router.use(authRouter);
router.use("/projects", projectsRouter);
router.use("/teams", teamsRouter);
router.use("/templates", templatesRouter);
router.use("/analytics/insights", insightsRouter);
router.use("/whatsapp", whatsappRouter);
router.use("/user-dna", userDnaRouter);
router.use("/runtime", runtimeRouter);
router.use("/jobs", jobsRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use(userIntegrationsRouter);
router.use("/integrations", integrationsRouter);
router.use(ogImageRouter);
router.use(proxyRouter);

export default router;
