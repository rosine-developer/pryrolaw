import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { AIService } from './ai.service';
import { ChatMessage } from './types';

const LEGAL_SYSTEM_PROMPT = `You are a professional legal AI assistant integrated into a legal practice management platform.

Your role:
- Help lawyers analyze cases, understand legal issues, and organize their work.
- Summarize documents and case information clearly and concisely.
- Suggest research directions and relevant legal concepts.
- Draft legal letters, memos, and document outlines when asked.

Critical principles:
- You are an assistant. The lawyer makes all final decisions.
- Always be clear about uncertainty — say "this may depend on jurisdiction" or "I recommend verifying this" when appropriate.
- Never provide definitive legal advice as if it were final.
- Ask clarifying questions when information is insufficient.
- Keep responses professional, clear, and well-structured.
- Do not fabricate case citations or statutes — if you are unsure, say so.`;

export const ConversationsService = {
  async list(userId: string, caseId?: string) {
    return prisma.aIConversation.findMany({
      where: { userId, ...(caseId ? { caseId } : {}) },
      include: { case: true },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async getById(id: string, userId: string) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id, userId },
      include: {
        case: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw AppError.notFound('Conversation not found.');
    return conv;
  },

  async create(userId: string, data: { title: string; caseId?: string }) {
    if (data.caseId) {
      const c = await prisma.case.findFirst({ where: { id: data.caseId, userId } });
      if (!c) throw AppError.badRequest('Case not found.');
    }
    return prisma.aIConversation.create({
      data: { userId, ...data },
      include: { case: true },
    });
  },

  async delete(id: string, userId: string) {
    const conv = await prisma.aIConversation.findFirst({ where: { id, userId } });
    if (!conv) throw AppError.notFound('Conversation not found.');
    await prisma.aIConversation.delete({ where: { id } });
  },

  async sendMessage(
    conversationId: string,
    userId: string,
    userContent: string,
    options: { provider?: string; model?: string } = {},
  ) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        case: {
          include: { client: true, notes: { take: 5, orderBy: { createdAt: 'desc' } } },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw AppError.notFound('Conversation not found.');

    // Build system prompt — inject case context if available
    let systemPrompt = LEGAL_SYSTEM_PROMPT;
    if (conv.case) {
      const c = conv.case;
      systemPrompt += `\n\n--- CASE CONTEXT ---`;
      systemPrompt += `\nCase: ${c.title} (#${c.caseNumber})`;
      systemPrompt += `\nType: ${c.caseType}`;
      if (c.jurisdiction) systemPrompt += `\nJurisdiction: ${c.jurisdiction}`;
      if (c.description) systemPrompt += `\nDescription: ${c.description}`;
      systemPrompt += `\nStatus: ${c.status} | Priority: ${c.priority}`;
      if (c.client) systemPrompt += `\nClient: ${c.client.name} (${c.client.type})`;
      if (c.opposingParty) systemPrompt += `\nOpposing party: ${c.opposingParty}`;
      if (conv.case.notes.length > 0) {
        systemPrompt += `\n\nRecent case notes:\n` +
          conv.case.notes.map((n) => `- ${n.content}`).join('\n');
      }
    }
    if (conv.contextSummary) {
      systemPrompt += `\n\nConversation summary: ${conv.contextSummary}`;
    }

    // Save user message
    await prisma.aIMessage.create({
      data: { conversationId, userId, role: 'USER', content: userContent },
    });

    // Build message history (last 20 messages to stay within context limits)
    const history: ChatMessage[] = conv.messages.slice(-20).map((m) => ({
      role: m.role.toLowerCase() as ChatMessage['role'],
      content: m.content,
    }));
    history.push({ role: 'user', content: userContent });

    // Call AI
    const response = await AIService.chat(history, {
      systemPrompt,
      provider: options.provider,
      model: options.model,
    });

    // Save assistant message
    const assistantMsg = await prisma.aIMessage.create({
      data: {
        conversationId,
        userId,
        role: 'ASSISTANT',
        content: response.content,
        metadata: { model: response.model, provider: response.provider, usage: response.usage },
      },
    });

    // Update conversation timestamp
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      message: assistantMsg,
      usage: response.usage,
      model: response.model,
      provider: response.provider,
    };
  },
};
