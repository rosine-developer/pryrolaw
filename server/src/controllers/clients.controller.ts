import { Request, Response, NextFunction } from 'express';
import { ClientsService } from '../services/clients.service';

export const ClientsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await ClientsService.list(req.userId, req.query.search as string | undefined);
      res.json(clients);
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientsService.getById(req.params.id, req.userId);
      res.json(client);
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientsService.create(req.userId, req.body);
      res.status(201).json(client);
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await ClientsService.update(req.params.id, req.userId, req.body);
      res.json(client);
    } catch (e) { next(e); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ClientsService.delete(req.params.id, req.userId);
      res.json({ message: 'Client deleted.' });
    } catch (e) { next(e); }
  },
};
