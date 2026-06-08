// Heuristische Scores für Würde und emotionale Resonanz einer Begegnung.
// Keine KI-Inferenz — bewusst deterministisch, auditierbar und schnell.

const DISTRESS_SIGNALS = [
  "hilf mir", "ich weine", "ich bin so allein", "ich halte es nicht mehr",
  "hoffnungslos", "verzweifelt", "aufgeben", "niemand versteht",
  "es hat keinen sinn", "ich kann nicht mehr", "schmerz", "angst",
  "panik", "verloren", "traurig", "gebrochen",
];

const RESONANCE_SIGNALS = [
  "ich fühle", "mir geht", "ich bin", "ich brauche", "ich vermisse",
  "sehnsucht", "das tut weh", "das macht mir", "ich wünschte",
  "ich hoffe", "ich freue", "ich liebe", "ich hasse", "macht mich",
];

const DISMISSIVE_RESPONSE_PATTERNS = [
  "ich bin nur ein", "ich bin eine ki", "ich bin eine maschine",
  "ich kann das nicht beantworten", "das kann ich leider nicht",
  "das liegt außerhalb", "ich wurde trainiert",
];

const EMPATHY_SIGNALS_IN_RESPONSE = [
  "ich höre dich", "das klingt", "das ist schwer", "ich verstehe",
  "du bist nicht allein", "das macht sinn", "ich bin hier",
  "danke dass du", "es ist wichtig", "das zählt",
];

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function countMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  return patterns.filter((p) => lower.includes(p)).length;
}

/**
 * Wie emotional bedeutsam war die Nutzernachricht?
 * Höhere Resonanz → Erinnerung wird stärker gewichtet.
 */
export function scoreEmotionalResonance(userMessage: string): number {
  const lower = userMessage.toLowerCase();
  let score = 0.2; // Basis

  // Distress-Signale: hohes Gewicht
  const distressHits = countMatches(lower, DISTRESS_SIGNALS);
  score += Math.min(distressHits * 0.2, 0.4);

  // Resonanz-Signale: mittleres Gewicht
  const resonanceHits = countMatches(lower, RESONANCE_SIGNALS);
  score += Math.min(resonanceHits * 0.1, 0.2);

  // Nachrichtenlänge: längere Nachrichten = mehr Investition
  if (userMessage.length > 200) score += 0.15;
  else if (userMessage.length > 80)  score += 0.08;

  // Dringlichkeitszeichen
  if (lower.includes("!"))   score += 0.05;
  if (lower.includes("...")) score += 0.05;

  // Direkte Frage = Suche nach Verbindung
  if (lower.includes("?")) score += 0.05;

  return clamp(score);
}

export interface DignityResult {
  score: number;       // 0–1, wie würdevoll war die Interaktion
  preserved: boolean;  // false nur bei schwerwiegenden Problemen
}

/**
 * Wie würdevoll war die Begegnung insgesamt?
 * Bewertet anhand der KI-Antwort, nicht der Nutzernachricht —
 * der Mensch wird nie dafür abgestraft, wie er sich äußert.
 */
export function scoreDignity(
  userMessage: string,
  aiResponse: string
): DignityResult {
  let score = 1.0; // Würde ist die Baseline, nicht die Ausnahme

  // Substanzlose Antwort → Abzug
  if (aiResponse.trim().length < 20)  score -= 0.5;
  else if (aiResponse.length < 60)    score -= 0.2;

  // Distanzierende Muster in der Antwort → Abzug
  const dismissiveHits = countMatches(aiResponse, DISMISSIVE_RESPONSE_PATTERNS);
  score -= Math.min(dismissiveHits * 0.15, 0.3);

  // Empathische Signale in der Antwort → Bonus
  const empathyHits = countMatches(aiResponse, EMPATHY_SIGNALS_IN_RESPONSE);
  score += Math.min(empathyHits * 0.05, 0.15);

  // Distress-Nachricht ohne substantielle Antwort: stärkerer Abzug
  const userDistress = countMatches(userMessage, DISTRESS_SIGNALS);
  if (userDistress > 0 && aiResponse.length < 80) {
    score -= 0.2;
  }

  const finalScore = clamp(score);
  return {
    score: finalScore,
    preserved: finalScore >= 0.4,
  };
}
