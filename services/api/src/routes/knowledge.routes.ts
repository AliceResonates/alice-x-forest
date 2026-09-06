import { Router, Request, Response } from "express";
import { KnowledgeService } from "../services/KnowledgeService";
import { asyncHandler } from "../utils/asyncHandler";

export const createKnowledgeRouter = (knowledgeService: KnowledgeService) => {
  const router = Router();

  // Sucht extern nur, wenn zur Frage nichts Brauchbares gespeichert ist.
  router.post(
    "/search",
    asyncHandler(async (req: Request, res: Response) => {
      const { query, tags, intent, maxResults, ttlHours, similarityThreshold } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }

      const result = await knowledgeService.searchOrRetrieve({
        query,
        tags,
        intent,
        maxResults,
        ttlHours,
        similarityThreshold,
      });

      return res.status(200).json(result);
    })
  );

  // Reiner Lesezugriff auf bereits vorhandenes Wissen, ohne extern zu suchen.
  router.post(
    "/lookup",
    asyncHandler(async (req: Request, res: Response) => {
      const { query, similarityThreshold } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }

      const entry = await knowledgeService.findExisting(query, similarityThreshold);
      return res.status(200).json({ found: entry !== null, entry });
    })
  );

  return router;
};
