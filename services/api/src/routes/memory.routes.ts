import { Router, Request, Response } from "express";
import { MemoryService } from "../services/MemoryService";
import { dignityCheckMiddleware } from "../middleware/dignity.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { AgentMemory } from "../types/memory";

export const createMemoryRouter = (memoryService: MemoryService) => {
  const router = Router();

  router.post(
    "/",
    dignityCheckMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const memory: AgentMemory = req.body;
      const dignity = (req as any).dignity;
      await memoryService.storeEncounter(memory, dignity.score);
      return res.status(201).json({ status: "stored" });
    })
  );

  router.get(
    "/forest",
    asyncHandler(async (req: Request, res: Response) => {
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const memories = await memoryService.getForestMemories(limit);
      return res.status(200).json({ memories });
    })
  );

  router.post(
    "/query",
    asyncHandler(async (req: Request, res: Response) => {
      const { context, agentId, limit } = req.body;
      if (!context || !agentId) {
        return res.status(400).json({ error: "context and agentId are required" });
      }
      const memories = await memoryService.retrieveMemories(context, agentId, limit ?? 5);
      return res.status(200).json({ count: memories.length, memories });
    })
  );

  return router;
};
