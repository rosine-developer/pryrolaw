import { AIProvider, AIRequestOptions, AIResponse, ChatMessage } from '../types';

interface GroqMessage {
  role: string;
  content: string;
}

interface GroqResponse {
  id: string;
  choices: { message: { role: string; content: string } }[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: { message: string };
}

export class GroqProvider implements AIProvider {
  readonly id = 'groq';
  readonly label = 'Groq';
  readonly defaultModel = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set.');
    }
    this.apiKey = process.env.GROQ_API_KEY;
  }

  async chat(messages: ChatMessage[], options: AIRequestOptions = {}): Promise<AIResponse> {
    const groqMessages: GroqMessage[] = [];

    // Prepend system prompt if provided
    if (options.systemPrompt) {
      groqMessages.push({ role: 'system', content: options.systemPrompt });
    }

    groqMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model ?? this.defaultModel,
        messages: groqMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as GroqResponse;
      throw new Error(body.error?.message ?? `Groq API error: ${res.status}`);
    }

    const data = await res.json() as GroqResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned an empty response.');

    return {
      content,
      model: data.model ?? this.defaultModel,
      provider: 'groq',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }
}
