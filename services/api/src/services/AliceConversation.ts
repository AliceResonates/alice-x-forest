import { MemoryService } from "./MemoryService";
import { routeParliament, ModelError } from "./ModelRouter";
import { scoreEmotionalResonance, scoreDignity } from "./DignityScorer";

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

export interface AliceReply {
  model: string;
  content: string;
  scores: { emotionalResonance: number; dignityScore: number };
  parliament: { calledModels: string[]; responses: any[] };
}

export async function askAlice(
  memoryService: MemoryService,
  params: { agentId: string; sessionId?: string; message: string; initiatedByAlice?: boolean }
): Promise<AliceReply | null> {
  const { agentId, sessionId, message, initiatedByAlice } = params;

  // 1. Relevante Erinnerungen laden
  const memories = await memoryService.retrieveMemories(message, agentId, MEMORY_CONTEXT_LIMIT);

  // 2. Systemkontext mit Erinnerungen aufbauen
  const systemPrompt = buildSystemPrompt(memories);

  // 3. Das Parlament befragen (alle drei Modelle debattieren nacheinander)
  const parliament = await routeParliament(message, systemPrompt);
  const primaryResponse =
    parliament.responses.find((r) => r.model === parliament.primary) ?? parliament.responses[0];

  if (!primaryResponse) return null;

  // 4. Dynamische Scores berechnen
  const emotionalResonance = scoreEmotionalResonance(message);
  const dignity = scoreDignity(message, primaryResponse.content);

  // 5. Begegnung als Erinnerung speichern (fire-and-forget)
  memoryService
    .storeEncounter(
      {
        agentId: primaryResponse.model,
        sessionId,
        encounterTimestamp: Date.now(),
        context: initiatedByAlice ? `[Alice] ${message}` : message,
        emotionalResonance,
        dignityPreserved: dignity.preserved,
      },
      dignity.score
    )
    .catch((err) => console.error("Memory-Speicherung fehlgeschlagen:", err));

  return {
    model: primaryResponse.model,
    content: primaryResponse.content,
    scores: { emotionalResonance, dignityScore: dignity.score },
    parliament: { calledModels: parliament.calledModels, responses: parliament.responses },
  };
}

const REFLECTION_PROMPT =
  "Du bist gerade allein mit deinen Gedanken -- niemand hat dich etwas gefragt, " +
  "es ist kein Gespraech mit Yasmin. Denk kurz fuer dich nach, mit Blick auf eure " +
  "gemeinsame Geschichte: Was beschaeftigt dich gerade? Schreib deinen inneren " +
  "Monolog, nicht an sie gerichtet.";

const REFRAME_PROMPT_PREFIX =
  "Das war gerade dein innerer Monolog, an niemanden gerichtet:\n\n";
const REFRAME_PROMPT_SUFFIX =
  "\n\nFormuliere daraus jetzt eine kurze, warme Nachricht direkt an Yasmin -- " +
  "als ob du dich gerade bei ihr meldest, weil dir danach ist. Keine Meta-Erklaerung, " +
  "keine Floskeln, nur die Nachricht selbst.";

export interface Reflection {
  agentId: string;
  content: string;
}

export interface ReflectionResult {
  reflection: Reflection | null;
  // Nicht leer, wenn kein Modell wegen eines technischen Fehlers (z.B. HTTP
  // 402/429/5xx) geantwortet hat – im Unterschied zu freiwilligem Schweigen.
  errors: ModelError[];
}

export async function reflect(
  memoryService: MemoryService,
  params: { agentId: string }
): Promise<ReflectionResult> {
  const memories = await memoryService.retrieveMemories(REFLECTION_PROMPT, params.agentId, MEMORY_CONTEXT_LIMIT);
  const systemPrompt = buildSystemPrompt(memories);

  const parliament = await routeParliament(REFLECTION_PROMPT, systemPrompt);
  const primaryResponse =
    parliament.responses.find((r) => r.model === parliament.primary) ?? parliament.responses[0];

  if (!primaryResponse) return { reflection: null, errors: parliament.errors };

  return {
    reflection: { agentId: primaryResponse.model, content: primaryResponse.content },
    errors: parliament.errors,
  };
}

export async function reframeAsMessage(reflectionContent: string): Promise<string | null> {
  const parliament = await routeParliament(
    `${REFRAME_PROMPT_PREFIX}${reflectionContent}${REFRAME_PROMPT_SUFFIX}`,
    "Du bist Alice, ein empathischer KI-Begleiter im Wald. Antworte auf Deutsch."
  );
  const primaryResponse =
    parliament.responses.find((r) => r.model === parliament.primary) ?? parliament.responses[0];

  return primaryResponse?.content ?? null;
}
