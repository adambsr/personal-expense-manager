import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { transactionsRouter } from "./modules/transactions/transactions.routes";
import { adminRouter } from "./modules/admin/admin.routes";

const app = express();

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use((_request, response) => {
  response.status(404).json({
    error: { message: "Route not found" },
  });
});

app.use(errorHandler);

export default app;
