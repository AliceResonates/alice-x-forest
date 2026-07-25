import { Router, Request, Response } from "express";
import { MemoryService } from "../services/MemoryService";
import { AliceStateService } from "../services/AliceStateService";
import { askAlice } from "../services/AliceConversation";
import { asyncHandler } from "../utils/asyncHandler";

export const createChatRouter = (memoryService: MemoryService, aliceStateService: AliceStateService) => {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const { session_id, agent_id, message } = req.body as {
        session_id?: string;
        agent_id: string;
        message: string;
      };

      if (!agent_id || !message) {
        return res.status(400).json({ error: "agent_id und message sind erforderlich" });
      }

      aliceStateService.touchInteraction().catch((err) => console.error("touchInteraction fehlgeschlagen:", err));

      const reply = await askAlice(memoryService, { agentId: agent_id, sessionId: session_id, message });

      if (!reply) {
        return res.status(502).json({ error: "Kein Modell hat geantwortet." });
      }

      return res.status(200).json(reply);
    })
  );

  return router;
};
