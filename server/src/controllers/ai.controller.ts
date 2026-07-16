import { Request, Response, NextFunction } from 'express';
import { ConversationsService } from '../services/ai/conversations.service';
import { AIService } from '../services/ai/ai.service';

export const AIController = {
  async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const { caseId } = req.query;
      const convs = await ConversationsService.list(req.userId, caseId as string | undefined);
      res.json(convs);
    } catch (e) { next(e); }
  },

  async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conv = await ConversationsService.getById(req.params.id, req.userId);
      res.json(conv);
    } catch (e) { next(e); }
  },

  async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const conv = await ConversationsService.create(req.userId, req.body);
      res.status(201).json(conv);
    } catch (e) { next(e); }
  },

  async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      await ConversationsService.delete(req.params.id, req.userId);
      res.json({ message: 'Conversation deleted.' });
    } catch (e) { next(e); }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, provider, model } = req.body;
      const result = await ConversationsService.sendMessage(
        req.params.id,
        req.userId,
        content,
        { provider, model },
      );
      res.json(result);
    } catch (e) { next(e); }
  },

  async getProviders(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(AIService.available);
    } catch (e) { next(e); }
  },
};
