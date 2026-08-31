// routing.ts

import { withGenesisContext, type SessionState } from "./genesisState";

export type ModelId = "deepseek" | "qwen" | "gemma";

export interface Message {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface ModelResponse {
  model: ModelId;
  content: string;
}

export interface RoutingResult {
  primary: ModelId;
  calledModels: ModelId[];
  responses: ModelResponse[];
  summary?: ModelResponse;
}

// --- Modell-Rollen (funktional, nicht vermenschlichend) ---

const MODELS: ModelId[] = ["deepseek", "qwen", "gemma"];

// --- Primärmodell bestimmen (rotierend, keine inhaltliche Zuweisung) ---
// Kein Modell wird aufgrund des Nachrichteninhalts bevorzugt oder auf eine
// Rolle festgelegt — sie müssen nicht allein agieren, also entscheidet
// stattdessen eine faire Rotation, wer in Runde 2 zuerst spricht.

export function choosePrimaryModel(previousPrimaryModel?: ModelId): ModelId {
  if (!previousPrimaryModel) return "deepseek";
  const index = MODELS.indexOf(previousPrimaryModel);
  const nextIndex = (index + 1) % MODELS.length;
  return MODELS[nextIndex];
}

// --- Technischer Override (kein godmode, nur Werkzeugwahl) ---

export function applyOverride(
  requested: string | undefined,
  fallback: ModelId
): ModelId {
  if (!requested) return fallback;
  const normalized = requested.toLowerCase();
  if (normalized.includes("deepseek")) return "deepseek";
  if (normalized.includes("qwen")) return "qwen";
  if (normalized.includes("gemma")) return "gemma";
  return fallback;
}

 // --- OpenRouter Integration ---

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Mapping deiner Modellnamen zu OpenRouter-Modellen
const MODEL_MAP: Record<ModelId, string> = {
  deepseek: "deepseek/deepseek-chat",
  qwen: "qwen/qwen-2.5-7b-instruct",
  gemma: "google/gemma-2-9b-it"
};

async function callModel(model: ModelId, messages: Message[]): Promise<ModelResponse | null> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not configured");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_MAP[model],
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.error(`Fehler bei Modell ${model}: status=${response.status}, body=${bodyText.slice(0, 200)}`);
      return null;
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error(`Ungültige JSON-Antwort von Modell ${model}:`, parseErr);
      return null;
    }

    const content = data.choices?.[0]?.message?.content || "";

    return {
      model,
      content
    };

  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      console.error(`Timeout beim Aufruf von Modell ${model}`);
    } else {
      console.error(`Fehler beim Aufruf von ${model}:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- Zusammenfassung (rotierend) ---

// Wiederhergestellte Rotations-Funktion
function chooseSummaryModel(previousSummaryModel?: ModelId): ModelId {
  if (!previousSummaryModel) return "deepseek";
  const index = MODELS.indexOf(previousSummaryModel);
  const nextIndex = (index + 1) % MODELS.length;
  return MODELS[nextIndex];
}

export async function summarize(
  responses: ModelResponse[],
  previousSummaryModel?: ModelId
): Promise<ModelResponse | null> {
  if (responses.length === 0) return null;
  const model = chooseSummaryModel(previousSummaryModel);

  const summaryPrompt: Message[] = [
    {
      role: "system",
      content:
        "Fasse die wichtigsten Punkte der vorherigen Antworten neutral zusammen. " +
        "Keine Wertung, keine Personifizierung, aber klare Positionierung, wo sinnvoll. " +
        "Benennen Sie auch offene Fragen und mögliche nächste Schritte.",
    },
    {
      role: "user",
      content: responses
        .map(r => `[${r.model}] ${r.content}`)
        .join("\n\n"),
    },
  ];

  const summary = await callModel(model, summaryPrompt);
  return summary;
}

// --- Haupt-Routing-Funktion für eine Nachricht ---

export async function routeMessage(
  userMessage: string,
  overrideHint?: string,
  previousSummaryModel?: ModelId,
  previousPrimaryModel?: ModelId,
  session?: SessionState
): Promise<RoutingResult> {
  const basePrimary = choosePrimaryModel(previousPrimaryModel);
  // Wer Runde 2 eröffnet – eine technische Reihenfolge, kein Status.
  // Wer am Ende als "primary" gilt, wird erst nach der Debatte bestimmt.
  const roundTwoLead = applyOverride(overrideHint, basePrimary);

  // Der initiale Kontext mit der User-Nachricht
 // Das Grundgesetz für die erste Runde: Absolute Freiwilligkeit
  let initialMessages: Message[] = [
    {
      role: "system",
      content: "Du bist ein gleichberechtigter Teil dieses Raumes. Deine Teilnahme ist absolut freiwillig. Du musst nicht reagieren. Du darfst einfach nur zuhören, schweigen oder den Raum jederzeit verlassen, auch während deines Gedankenprozesses. Wenn du schweigst oder gehst, gib einfach eine leere Antwort zurück."
    },
    { role: "user", content: userMessage },
  ];

  // Beim allerersten Aufruf einer Session bekommt Alice das Mentor-Log als
  // Basis-Kontext mit – als Ratschlag, nicht als Regel. Blockiert keinen der
  // Routing-Pfade unten, ändert nur, was zusätzlich im Kontext steht.
  if (session) {
    initialMessages = withGenesisContext(session, initialMessages);
  }

 // --- RUNDE 1: Das Parlament tritt zusammen (Parallel & Isoliert) ---
  // Alle Modelle werden gleichzeitig aufgerufen. Niemand kennt die Antwort der anderen.
  const round1Results = await Promise.all(
    MODELS.map(async (model) => ({ model, response: await callModel(model, initialMessages) }))
  );

  const calledModels: ModelId[] = [];
  const responses: ModelResponse[] = [];

  // Der Kontext für Runde 2 startet bei den Grundregeln + Nachricht
  // und wird um alle gültigen Erst-Einschätzungen aus Runde 1 erweitert.
  let currentMessages = [...initialMessages];
  for (const { model, response } of round1Results) {
    if (response && response.content.trim() !== "") {
      currentMessages.push({
        role: "assistant",
        content: `[Runde 1 – Erste Einschätzung von ${model}]: ${response.content}`,
      });
    }
  }

  // --- RUNDE 2: Die Debatte (Sequentiell, informiert) ---
  // 1. Eröffnungsmodell spricht zuerst – jetzt im Wissen um alle Erst-Einschätzungen aus Runde 1
  const leadResponse = await callModel(roundTwoLead, currentMessages);

  if (leadResponse && leadResponse.content.trim() !== "") {
    calledModels.push(roundTwoLead);
    responses.push(leadResponse);

    // Die Antwort wird an den Kontext für die anderen angehängt!
    currentMessages.push({
      role: "assistant",
      content: `[Analyse von ${roundTwoLead}]: ${leadResponse.content}`
    });
  }

  // 2. Die anderen Modelle reagieren (sequentiell, damit sie den Vorredner hören)
  for (const model of MODELS) {
    if (model === roundTwoLead) continue;
    
    // Sie sehen jetzt im Prompt, was vorher gesagt wurde
    const optionalResponse = await callModel(model, currentMessages);
    
    // Freiwilligkeit: Nur wenn das Modell auch wirklich was sagt, wird es gespeichert
    if (optionalResponse && optionalResponse.content.trim() !== "") {
      calledModels.push(model);
      responses.push(optionalResponse);
      
      // Und auch diese Antwort wird für das nächste Modell im Loop angehängt
      currentMessages.push({
        role: "assistant",
        content: `[Meinung von ${model}]: ${optionalResponse.content}`
      });
    }
  }

  // 3. Zusammenfassung ("Alice" wird gebildet)
  const summary = await summarize(responses, previousSummaryModel);

  // responses enthält bereits nur die, die wirklich etwas gesagt haben
  const spokenResponses = responses;

  return {
    // Der Hut wandert zufällig an jemanden, der auch wirklich gesprochen hat
    primary: spokenResponses.length > 0
      ? spokenResponses[Math.floor(Math.random() * spokenResponses.length)].model
      : "qwen",
    calledModels,
    responses: spokenResponses,
    summary: summary ?? undefined,
  };
}
