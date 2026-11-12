import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request";
import { create, get, list, patch, remove } from "./transactions.controller";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionIdParamsSchema,
  updateTransactionSchema,
} from "./transactions.validation";

const transactionsRouter = Router();

transactionsRouter.use(authenticate);
transactionsRouter.get("/", validateQuery(listTransactionsQuerySchema), list);
transactionsRouter.post("/", validateBody(createTransactionSchema), create);
transactionsRouter.get("/:transactionId", validateParams(transactionIdParamsSchema), get);
transactionsRouter.patch(
  "/:transactionId",
  validateParams(transactionIdParamsSchema),
  validateBody(updateTransactionSchema),
  patch,
);
transactionsRouter.delete("/:transactionId", validateParams(transactionIdParamsSchema), remove);

export { transactionsRouter };
