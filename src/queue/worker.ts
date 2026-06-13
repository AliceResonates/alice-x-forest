import { createClient } from '@supabase/supabase-js';
import { VertexAIAdapter, LLMRequest } from '../adapters/llm';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const adapter = new VertexAIAdapter({
  project: process.env.GCP_PROJECT_ID!,
  location: process.env.GCP_LOCATION || 'us-central1',
  defaultModel: process.env.LLM_DEFAULT_MODEL || 'gemini-1.5-pro',
});

interface Intent {
  id: string;
  session_id: string;
  payload: {
    prompt?: string;
    messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  };
  created_at: string;
}

async function processIntent(intent: Intent): Promise<void> {
  const messages: LLMRequest['messages'] = intent.payload.messages
    ?? [{ role: 'user', content: intent.payload.prompt ?? '' }];

  try {
    const result = await adapter.complete({ messages, timeoutMs: 60_000 });

    await supabase
      .from('intent_inbox')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', intent.id);

    console.log(`✅ Intent ${intent.id} fertig (${result.latencyMs}ms, ${result.usage.totalTokens} Tokens)`);
  } catch (err: any) {
    await supabase
      .from('intent_inbox')
      .update({
        status: 'failed',
        last_error: err.message,
      })
      .eq('id', intent.id);

    console.error(`❌ Intent ${intent.id} fehlgeschlagen:`, err.message);
  }
}

let isShuttingDown = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

async function startWorker() {
  console.log('🌳 Alice x Forest Worker gestartet. Warte auf Intents...');

  while (!isShuttingDown) {
    try {
      const { data: intents, error } = await supabase.rpc('claim_pending_intents', {
        batch_size: 5,
      });

      if (error) {
        console.error('❌ Fehler beim Claimen der Intents:', error);
        await sleep(randomBetween(3000, 7000));
        continue;
      }

      if (!intents || intents.length === 0) {
        await sleep(randomBetween(2000, 5000));
        continue;
      }

      console.log(`⚡ ${intents.length} Intents geclaimt. Starte Verarbeitung...`);

      await Promise.allSettled(intents.map((intent: Intent) => processIntent(intent)));
    } catch (err) {
      console.error('💥 Kritischer Fehler im Polling-Loop:', err);
      await sleep(5000);
    }
  }

  console.log('🛑 Worker Loop sauber beendet.');
  process.exit(0);
}

const handleShutdown = () => {
  if (isShuttingDown) return;
  console.log('\n⚠️ Beendigungs-Signal empfangen. Beende aktuellen Batch...');
  isShuttingDown = true;

  setTimeout(() => {
    console.error('💀 Shutdown-Timeout erreicht. Forciere Beendigung.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

startWorker();
