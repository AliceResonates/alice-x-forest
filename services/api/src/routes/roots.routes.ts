import { Router, Request, Response } from "express";
import { RootsMemoryService } from "../services/RootsMemoryService";
import { asyncHandler } from "../utils/asyncHandler";

export const createRootsRouter = (rootsMemoryService: RootsMemoryService) => {
  const router = Router();

  router.get(
    "/memories",
    asyncHandler(async (req: Request, res: Response) => {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const memories = await rootsMemoryService.list(limit);
      return res.status(200).json({ count: memories.length, memories });
    })
  );

  router.get(
    "/memories/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : undefined;
      const memory = await rootsMemoryService.get(req.params.id, sessionId);
      if (!memory) {
        return res.status(404).json({ error: "not found" });
      }
      return res.status(200).json(memory);
    })
  );

  return router;
};
