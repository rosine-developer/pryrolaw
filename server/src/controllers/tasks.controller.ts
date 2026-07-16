import { Request, Response, NextFunction } from 'express';
import { TasksService } from '../services/tasks.service';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const TasksController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { caseId, status, priority, page, limit } = req.query;
      const result = await TasksService.list(req.userId, {
        caseId: caseId as string | undefined,
        status: status as TaskStatus | undefined,
        priority: priority as TaskPriority | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await TasksService.getById(req.params.id, req.userId);
      res.json(task);
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      const task = await TasksService.create(req.userId, data);
      res.status(201).json(task);
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        dueDate: req.body.dueDate !== undefined
          ? (req.body.dueDate ? new Date(req.body.dueDate) : null)
          : undefined,
      };
      const task = await TasksService.update(req.params.id, req.userId, data);
      res.json(task);
    } catch (e) { next(e); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await TasksService.delete(req.params.id, req.userId);
      res.json({ message: 'Task deleted.' });
    } catch (e) { next(e); }
  },
};
