// AI Service Layer — provider-agnostic interfaces
// Adding a new provider (Gemini, OpenAI, Anthropic, OpenRouter) means
// implementing AIProvider and registering it — nothing else changes.

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly defaultModel: string;
  chat(messages: ChatMessage[], options?: AIRequestOptions): Promise<AIResponse>;
}
