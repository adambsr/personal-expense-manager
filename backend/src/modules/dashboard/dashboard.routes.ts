import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validateQuery } from "../../middleware/validate-request";
import { summary } from "./dashboard.controller";
import { dashboardSummaryQuerySchema } from "./dashboard.validation";

const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  authenticate,
  validateQuery(dashboardSummaryQuerySchema),
  summary,
);

export { dashboardRouter };
