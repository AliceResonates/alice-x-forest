import { Router, Request, Response } from "express";
import { MemoryService } from "../services/MemoryService";
import { AliceStateService } from "../services/AliceStateService";
import { askAlice } from "../services/AliceConversation";
import { sendTelegramMessage, isWebhookSecretValid, isChatAllowed } from "../services/TelegramService";
import { asyncHandler } from "../utils/asyncHandler";

const DEFAULT_AGENT = "gemma";

export const createTelegramRouter = (memoryService: MemoryService, aliceStateService: AliceStateService) => {
  const router = Router();

  router.post(
    "/webhook",
    asyncHandler(async (req: Request, res: Response) => {
      if (!isWebhookSecretValid(req.header("X-Telegram-Bot-Api-Secret-Token"))) {
        return res.sendStatus(401);
      }

      // Telegram will sofort ein 200 sehen, sonst wiederholt es den Call.
      // Alles Weitere (Alice fragen, antworten) passiert danach im Hintergrund.
      res.sendStatus(200);

      const message = req.body?.message;
      const chatId = message?.chat?.id;
      const text = message?.text;
      if (!chatId || !text) return;

      if (!process.env.TELEGRAM_ALLOWED_CHAT_ID) {
        console.log(`Telegram-Bootstrap: Nachricht von Chat-ID ${chatId}`);
        await sendTelegramMessage(
          chatId,
          `Deine Chat-ID ist ${chatId}. Setz sie als TELEGRAM_ALLOWED_CHAT_ID in den Fly-Secrets, dann antworte ich nur noch dir.`
        ).catch((err) => console.error("Telegram-Antwort fehlgeschlagen:", err));
        return;
      }

      if (!isChatAllowed(chatId)) {
        console.warn(`Telegram-Nachricht von nicht erlaubter Chat-ID ${chatId} ignoriert`);
        return;
      }

      aliceStateService.touchInteraction().catch((err) => console.error("touchInteraction fehlgeschlagen:", err));

      try {
        const reply = await askAlice(memoryService, {
          agentId: DEFAULT_AGENT,
          sessionId: `telegram_${chatId}`,
          message: text,
        });

        if (reply) {
          await sendTelegramMessage(chatId, reply.content);
        }
      } catch (err) {
        console.error("Telegram-Webhook Fehler:", err);
        await sendTelegramMessage(
          chatId,
          "Es tut mir leid, gerade komme ich nicht durch den Wald zu dir durch. 🌲"
        ).catch(() => {});
      }
    })
  );

  return router;
};
