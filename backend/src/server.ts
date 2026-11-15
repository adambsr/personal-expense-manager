import "dotenv/config";
import app from "./app";
import { bootstrapInitialAdministrator } from "./modules/admin/admin.service";

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

async function startServer() {
  await bootstrapInitialAdministrator();
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

void startServer();
