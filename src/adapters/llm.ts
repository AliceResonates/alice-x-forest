import { VertexAI, Content } from '@google-cloud/vertexai';

export interface LLMRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number; // Custom Timeout pro Request
}

export interface LLMResponse {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  raw?: any;
}

export interface LLMProvider {
  complete(req: LLMRequest): Promise<LLMResponse>;
}

// Der OpenAI-kompatible Adapter. 
// Funktioniert für OpenAI, OpenRouter, LM Studio, Ollama, vLLM etc.
export class OpenAICompatibleAdapter implements LLMProvider {
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(config: { baseUrl: string; apiKey: string; defaultModel: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel;
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const timeout = req.timeoutMs || 60000; // Default 60s Timeout (verhindert undici 300s Limit)

    const payload = {
      model: req.model || this.defaultModel,
      messages: req.messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        // Hier passiert die Magie: Node.js bricht den Call nativ nach X ms ab!
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        // Retry-After Header auslesen, falls vorhanden
        const retryAfter = response.headers.get('retry-after');
        throw new Error(`API Fehler ${response.status}: ${response.statusText} ${retryAfter ? `(Retry-After: ${retryAfter}s)` : ''}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        content: data.choices?.[0]?.message?.content || '',
        finishReason: data.choices?.[0]?.finish_reason || 'unknown',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        latencyMs,
        raw: data,
      };

    } catch (error: any) {
      // Wenn der Timeout getriggert wird, wirft fetch einen "TimeoutError"
      if (error.name === 'TimeoutError') {
        throw new Error(`Request Timeout nach ${timeout}ms überschritten.`);
      }
      throw error;
    }
  }
}

export class VertexAIAdapter implements LLMProvider {
  private vertexAI: VertexAI;
  private defaultModel: string;

  constructor(config: { project: string; location: string; defaultModel?: string }) {
    this.vertexAI = new VertexAI({ project: config.project, location: config.location });
    this.defaultModel = config.defaultModel ?? 'gemini-1.5-pro';
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const timeout = req.timeoutMs ?? 60_000;

    // Vertex AI takes systemInstruction separately — extract system messages first
    const systemText = req.messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n') || undefined;

    const contents: Content[] = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const model = this.vertexAI.getGenerativeModel(
      {
        model: req.model ?? this.defaultModel,
        generationConfig: {
          maxOutputTokens: req.maxTokens,
          temperature: req.temperature,
        },
        ...(systemText ? { systemInstruction: systemText } : {}),
      },
      { timeout },
    );

    const result = await model.generateContent({ contents });
    const response = result.response;
    const latencyMs = Date.now() - startTime;

    const candidate = response.candidates?.[0];
    const content = candidate?.content?.parts
      ?.map(p => ('text' in p ? (p as { text: string }).text : ''))
      .join('') ?? '';

    return {
      content,
      finishReason: candidate?.finishReason ?? 'unknown',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
      latencyMs,
      raw: response,
    };
  }
}