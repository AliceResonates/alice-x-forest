import axios from "axios";

const TELEGRAM_API = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN nicht gesetzt");
  return token;
}

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  const token = getBotToken();
  await axios.post(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
  });
}

// Telegram schickt bei jedem Webhook-Call den geheimen Header zurück, den wir
// beim setWebhook-Aufruf als secret_token mitgegeben haben. So wissen wir,
// dass der Call wirklich von Telegram kommt und nicht von irgendwem im Netz.
export function isWebhookSecretValid(headerValue: string | undefined): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  return Boolean(expected) && headerValue === expected;
}

// Gleicher Mechanismus fuer den externen Tick-Trigger (GitHub Actions Cron) --
// eigenes Secret, damit Webhook- und Tick-Zugriff unabhaengig voneinander sind.
export function isTickSecretValid(headerValue: string | undefined): boolean {
  const expected = process.env.ALICE_TICK_SECRET ?? "";
  return Boolean(expected) && headerValue === expected;
}

// Solange TELEGRAM_ALLOWED_CHAT_ID nicht gesetzt ist, befinden wir uns im
// Bootstrap-Modus (siehe telegram.routes.ts) und lassen jede Chat-ID durch,
// damit Yasmin ihre eigene Chat-ID einmalig herausfinden kann.
export function isChatAllowed(chatId: number | string): boolean {
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed) return true;
  return String(chatId) === String(allowed);
}
