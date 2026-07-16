import { Request, Response, NextFunction } from 'express';
import { CasesService } from '../services/cases.service';
import { CasePriority, CaseStatus } from '@prisma/client';

export const CasesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority, caseType, search, page, limit } = req.query;
      const result = await CasesService.list(req.userId, {
        status: status as CaseStatus | undefined,
        priority: priority as CasePriority | undefined,
        caseType: caseType as string | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const c = await CasesService.getById(req.params.id, req.userId);
      res.json(c);
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const c = await CasesService.create(req.userId, req.body);
      res.status(201).json(c);
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const c = await CasesService.update(req.params.id, req.userId, req.body);
      res.json(c);
    } catch (e) { next(e); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await CasesService.delete(req.params.id, req.userId);
      res.json({ message: 'Case deleted.' });
    } catch (e) { next(e); }
  },

  // Notes
  async getNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await CasesService.getNotes(req.params.id, req.userId);
      res.json(notes);
    } catch (e) { next(e); }
  },
  async createNote(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await CasesService.createNote(req.params.id, req.userId, req.body.content);
      res.status(201).json(note);
    } catch (e) { next(e); }
  },
  async deleteNote(req: Request, res: Response, next: NextFunction) {
    try {
      await CasesService.deleteNote(req.params.noteId, req.userId);
      res.json({ message: 'Note deleted.' });
    } catch (e) { next(e); }
  },

  // Timeline
  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await CasesService.getTimeline(req.params.id, req.userId);
      res.json(events);
    } catch (e) { next(e); }
  },
  async createTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await CasesService.createTimelineEvent(req.params.id, req.userId, {
        ...req.body,
        eventDate: new Date(req.body.eventDate),
      });
      res.status(201).json(event);
    } catch (e) { next(e); }
  },
  async deleteTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      await CasesService.deleteTimelineEvent(req.params.eventId, req.userId);
      res.json({ message: 'Timeline event deleted.' });
    } catch (e) { next(e); }
  },
};
