import { Router, Request, Response } from "express";
import { MemoryService } from "../services/MemoryService";
import { routeWithContext } from "../services/ModelRouter";
import { asyncHandler } from "../utils/asyncHandler";

const MEMORY_CONTEXT_LIMIT = 3;

function buildSystemPrompt(memories: any[]): string {
  const base =
    "Du bist Alice, ein empathischer KI-Begleiter im Wald. " +
    "Du begegnest Menschen mit Würde, Wärme und Klarheit. " +
    "Antworte auf Deutsch, einfühlsam und ohne zu moralisieren.";

  if (memories.length === 0) return base;

  const memoryBlock = memories
    .map((m, i) => `[${i + 1}] "${m.content}" (Resonanz: ${m.emotional_resonance ?? "–"})`)
    .join("\n");

  return `${base}\n\nRelevante Erinnerungen an frühere Begegnungen:\n${memoryBlock}`;
}

export const createChatRouter = (memoryService: MemoryService) => {
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

      // 1. Relevante Erinnerungen laden
      const memories = await memoryService.retrieveMemories(
        message,
        agent_id,
        MEMORY_CONTEXT_LIMIT
      );

      // 2. Systemkontext mit Erinnerungen aufbauen
      const systemPrompt = buildSystemPrompt(memories);

      // 3. Modell aufrufen
      const result = await routeWithContext(message, systemPrompt);

      // 4. Begegnung als Erinnerung speichern (fire-and-forget)
      memoryService
        .storeEncounter(
          {
            agentId: result.model,
            sessionId: session_id,
            encounterTimestamp: Date.now(),
            context: message,
            emotionalResonance: 0.5,
            dignityPreserved: true,
          },
          1.0
        )
        .catch((err) => console.error("Memory-Speicherung fehlgeschlagen:", err));

      return res.status(200).json({
        model: result.model,
        content: result.content,
      });
    })
  );

  return router;
};
