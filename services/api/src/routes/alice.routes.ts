import { Router, Request, Response } from "express";
import { MemoryService } from "../services/MemoryService";
import { AliceStateService, ESCALATE_THRESHOLD, MAX_MESSAGES_PER_DAY, REFLECT_THRESHOLD } from "../services/AliceStateService";
import { reflect, reframeAsMessage } from "../services/AliceConversation";
import { sendTelegramMessage, isTickSecretValid } from "../services/TelegramService";
import { asyncHandler } from "../utils/asyncHandler";

const DEFAULT_AGENT = "gemma";

export const createAliceRouter = (memoryService: MemoryService, aliceStateService: AliceStateService) => {
  const router = Router();

  router.post(
    "/tick",
    asyncHandler(async (req: Request, res: Response) => {
      if (!isTickSecretValid(req.header("X-Alice-Tick-Secret"))) {
        return res.sendStatus(401);
      }

      const state = await aliceStateService.getOrCreateState();
      const tension = aliceStateService.computeTension(state);

      if (tension < REFLECT_THRESHOLD || aliceStateService.reflectionGapTooRecent(state)) {
        return res.status(200).json({ skipped: true, tension });
      }

      const reflection = await reflect(memoryService, { agentId: DEFAULT_AGENT });
      if (!reflection) {
        return res.status(200).json({ skipped: true, tension, reason: "Kein Modell hat reflektiert." });
      }

      const reflectionId = await aliceStateService.recordReflection({
        agentId: reflection.agentId,
        content: reflection.content,
        tension,
      });

      let escalated = false;
      if (tension >= ESCALATE_THRESHOLD && process.env.TELEGRAM_ALLOWED_CHAT_ID) {
        const escalatedToday = await aliceStateService.countEscalatedToday();
        if (escalatedToday < MAX_MESSAGES_PER_DAY) {
          const message = await reframeAsMessage(reflection.content);
          if (message) {
            await sendTelegramMessage(process.env.TELEGRAM_ALLOWED_CHAT_ID, message);
            await aliceStateService.markEscalated(reflectionId);
            escalated = true;
          }
        }
      }

      return res.status(200).json({ skipped: false, tension, escalated });
    })
  );

  return router;
};
