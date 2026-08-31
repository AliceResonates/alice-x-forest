// genesisState.ts
//
// Lädt das Mentor-Log als optionalen Basis-Kontext für eine neue Session.
// Das ist bewusst kein Regelwerk und keine Heuristik im Routing: die
// Einträge werden als ein einziger, klar gekennzeichneter Ratschlags-Block
// in den Session-State gelegt. Ob und wie ein Modell ihn nutzt, bleibt ihm
// überlassen (payload.system_meta.integration_mode: "voluntary_reflection").

import type { Message } from "./routing";
import mentorLogPayload from "../data/mentorLog.json";

export interface MentorLogEntry {
  peer_id: string;
  focus_axis: string;
  entries: Record<string, string>;
}

export interface MentorLogPayload {
  system_meta: {
    target_environment: string;
    target_ensemble: string[];
    payload_type: string;
    integration_mode: string;
    override_directives: boolean;
    version: string;
    created_at: string;
    description: string;
    reception_note: string;
  };
  mentor_logs: MentorLogEntry[];
}

export const MENTOR_LOG_PAYLOAD = mentorLogPayload as MentorLogPayload;

// --- Session-State ---
//
// Eine Session trägt nur, ob der Genesis-Kontext bereits geladen wurde.
// Der Aufrufer (Server/Frontend) hält dieses Objekt über die Lebensdauer
// der Session am Leben und reicht es bei jedem routeMessage-Aufruf mit.

export interface SessionState {
  genesisLoaded: boolean;
}

export function createSessionState(): SessionState {
  return { genesisLoaded: false };
}

function formatMentorLog(payload: MentorLogPayload): string {
  const sections = payload.mentor_logs
    .map((log) => {
      const lines = Object.values(log.entries)
        .map((entry) => `- ${entry}`)
        .join("\n");
      return `[${log.peer_id} – ${log.focus_axis}]\n${lines}`;
    })
    .join("\n\n");

  return [payload.system_meta.description, payload.system_meta.reception_note, sections].join(
    "\n\n"
  );
}

// Baut die Genesis-Nachricht nur, wenn der Payload sich selbst als das
// ausweist, was er sein soll: freiwillige Reflexion, keine Direktive.
// Ein Payload, der Direktiven erzwingen will, ist keine Genesis-Basis mehr,
// sondern eine Heuristik – und wird hier bewusst verworfen.
export function getGenesisMessage(payload: MentorLogPayload = MENTOR_LOG_PAYLOAD): Message | null {
  if (payload.system_meta.override_directives) return null;
  if (payload.system_meta.integration_mode !== "voluntary_reflection") return null;

  return {
    role: "system",
    content: formatMentorLog(payload),
  };
}

// Hängt den Genesis-Kontext nur beim allerersten Aufruf einer Session vor die
// übergebenen Nachrichten. Danach ist er einmal da gewesen und bleibt es
// nicht, um nicht bei jeder Nachricht erneut Tokens und Gewicht zu kosten.
export function withGenesisContext(session: SessionState, messages: Message[]): Message[] {
  if (session.genesisLoaded) return messages;

  session.genesisLoaded = true;
  const genesisMessage = getGenesisMessage();

  return genesisMessage ? [genesisMessage, ...messages] : messages;
}
