/**
 * AI Service — the single entry point for all AI operations.
 *
 * Provider registry pattern:
 *   - Providers are registered at startup.
 *   - Callers never import a provider directly.
 *   - Adding Gemini/OpenAI/Anthropic = add a provider class + register it here.
 */

import { AIProvider, AIRequestOptions, AIResponse, ChatMessage } from './types';
import { GroqProvider } from './providers/groq.provider';

class AIServiceRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProviderId = 'groq';

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  setDefault(id: string): void {
    if (!this.providers.has(id)) throw new Error(`Provider '${id}' is not registered.`);
    this.defaultProviderId = id;
  }

  get available() {
    return Array.from(this.providers.values()).map((p) => ({ id: p.id, label: p.label, defaultModel: p.defaultModel }));
  }

  async chat(
    messages: ChatMessage[],
    options: AIRequestOptions & { provider?: string } = {},
  ): Promise<AIResponse> {
    const id = options.provider ?? this.defaultProviderId;
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`AI provider '${id}' is not available.`);
    return provider.chat(messages, options);
  }
}

// Singleton
export const AIService = new AIServiceRegistry();

// Register providers — order matters: first registered is the default
try {
  AIService.register(new GroqProvider());
} catch (e) {
  console.warn('[AI] Groq provider not available:', (e as Error).message);
}
