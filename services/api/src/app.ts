import express from "express";
import cors from "cors";
import { createMemoryRouter } from "./routes/memory.routes";
import { createSessionsRouter } from "./routes/sessions.routes";
import { createChatRouter } from "./routes/chat.routes";
import { createTelegramRouter } from "./routes/telegram.routes";
import { createAliceRouter } from "./routes/alice.routes";
import { createKnowledgeRouter } from "./routes/knowledge.routes";
import { errorHandler } from "./middleware/error.middleware";
import { MemoryService } from "./services/MemoryService";
import { AliceStateService } from "./services/AliceStateService";
import { KnowledgeService } from "./services/KnowledgeService";
import { TavilySearchAdapter } from "./services/SearchProvider";
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
const aliceStateService = new AliceStateService(pool);
const searchProvider = new TavilySearchAdapter(process.env.TAVILY_API_KEY ?? "");
const knowledgeService = new KnowledgeService(pool, searchProvider);

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
  app.use("/api/chat", createChatRouter(memoryService, aliceStateService));
  app.use("/api/telegram", createTelegramRouter(memoryService, aliceStateService));
  app.use("/api/alice", createAliceRouter(memoryService, aliceStateService));
  app.use("/api/knowledge", createKnowledgeRouter(knowledgeService));
  app.use(errorHandler);
  return app;
};
