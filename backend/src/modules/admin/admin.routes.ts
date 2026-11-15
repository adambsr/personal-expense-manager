import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/authenticate";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate-request";
import { categoryIdParamsSchema, createAdminUserSchema, createGlobalCategorySchema, listCategoriesQuerySchema, listUsersQuerySchema, updateAdminUserSchema, updateGlobalCategorySchema, userIdParamsSchema } from "./admin.validation";
import { categories, createAdminUser, createCategory, overview, updateAdminUser, updateCategory, userDetails, users } from "./admin.controller";

const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get("/overview", overview);
adminRouter.get("/users", validateQuery(listUsersQuerySchema), users);
adminRouter.post("/users", validateBody(createAdminUserSchema), createAdminUser);
adminRouter.get("/users/:userId", validateParams(userIdParamsSchema), userDetails);
adminRouter.patch("/users/:userId", validateParams(userIdParamsSchema), validateBody(updateAdminUserSchema), updateAdminUser);
adminRouter.get("/categories", validateQuery(listCategoriesQuerySchema), categories);
adminRouter.post("/categories", validateBody(createGlobalCategorySchema), createCategory);
adminRouter.patch("/categories/:categoryId", validateParams(categoryIdParamsSchema), validateBody(updateGlobalCategorySchema), updateCategory);

export { adminRouter };
