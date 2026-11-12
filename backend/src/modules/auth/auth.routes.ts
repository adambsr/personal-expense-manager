import { Router } from "express";
import express from "express";
import { authenticate } from "../../middleware/authenticate";
import { validateBody } from "../../middleware/validate-request";
import { deleteMyAvatar, login, me, myAvatar, register, updateMe, updateMyAvatar } from "./auth.controller";
import { loginSchema, registerSchema, updateProfileSchema } from "./auth.validation";

const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.get("/me", authenticate, me);
authRouter.put("/me", authenticate, validateBody(updateProfileSchema), updateMe);
authRouter.get("/me/avatar", authenticate, myAvatar);
authRouter.delete("/me/avatar", authenticate, deleteMyAvatar);
authRouter.put(
  "/me/avatar",
  authenticate,
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "1mb" }),
  updateMyAvatar,
);

export { authRouter };
