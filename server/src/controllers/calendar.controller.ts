import { Request, Response, NextFunction } from 'express';
import { CalendarService } from '../services/calendar.service';
import { EventType } from '@prisma/client';

export const CalendarController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { caseId, eventType, from, to } = req.query;
      const events = await CalendarService.list(req.userId, {
        caseId: caseId as string | undefined,
        eventType: eventType as EventType | undefined,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
      });
      res.json(events);
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await CalendarService.getById(req.params.id, req.userId);
      res.json(event);
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        reminderMinutes: req.body.reminderMinutes ? Number(req.body.reminderMinutes) : undefined,
      };
      const event = await CalendarService.create(req.userId, data);
      res.status(201).json(event);
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        reminderMinutes: req.body.reminderMinutes ? Number(req.body.reminderMinutes) : undefined,
      };
      const event = await CalendarService.update(req.params.id, req.userId, data);
      res.json(event);
    } catch (e) { next(e); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await CalendarService.delete(req.params.id, req.userId);
      res.json({ message: 'Event deleted.' });
    } catch (e) { next(e); }
  },

  async upcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? Number(req.query.days) : 7;
      const events = await CalendarService.getUpcoming(req.userId, days);
      res.json(events);
    } catch (e) { next(e); }
  },
};
