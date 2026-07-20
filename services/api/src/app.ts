import express from "express";
import cors from "cors";
import { createMemoryRouter } from "./routes/memory.routes";
import { createSessionsRouter } from "./routes/sessions.routes";
import { createChatRouter } from "./routes/chat.routes";
import { errorHandler } from "./middleware/error.middleware";
import { MemoryService } from "./services/MemoryService";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  user: process.env.DB_USER || "axf_user",
  password: process.env.DB_PASSWORD || "axf_pass",
  database: process.env.DB_NAME || "axf_db",
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

const memoryService = new MemoryService(pool);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const createApp = () => {
  const app = express();
  app.use(cors(ALLOWED_ORIGINS.length ? { origin: ALLOWED_ORIGINS } : {}));
  app.use(express.json());
  app.use("/api/memory", createMemoryRouter(memoryService));
  app.use("/api/sessions", createSessionsRouter());
  app.use("/api/chat", createChatRouter(memoryService));
  app.use(errorHandler);
  return app;
};
