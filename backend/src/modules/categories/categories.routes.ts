import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { validateBody, validateParams } from "../../middleware/validate-request";
import { create, get, list, patch, remove } from "./categories.controller";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.validation";

const categoriesRouter = Router();

categoriesRouter.use(authenticate);
categoriesRouter.get("/", list);
categoriesRouter.post("/", validateBody(createCategorySchema), create);
categoriesRouter.get("/:categoryId", validateParams(categoryIdParamsSchema), get);
categoriesRouter.patch(
  "/:categoryId",
  validateParams(categoryIdParamsSchema),
  validateBody(updateCategorySchema),
  patch,
);
categoriesRouter.delete("/:categoryId", validateParams(categoryIdParamsSchema), remove);

export { categoriesRouter };
