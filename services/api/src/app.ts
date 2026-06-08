import express from "express";
import { createMemoryRouter } from "./routes/memory.routes";
import { createSessionsRouter } from "./routes/sessions.routes";
import { errorHandler } from "./middleware/error.middleware";
import { MemoryService } from "./services/MemoryService";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  user: process.env.DB_USER || "axf_user",
  password: process.env.DB_PASSWORD || "axf_pass",
  database: process.env.DB_NAME || "axf_db",
  port: 5432,
});

const memoryService = new MemoryService(pool);

export const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/memory", createMemoryRouter(memoryService));
  app.use("/api/sessions", createSessionsRouter());
  app.use(errorHandler);
  return app;
};
