import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';

export const ProfileController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await ProfileService.get(req.userId);
      res.json(profile);
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await ProfileService.upsert(req.userId, req.body);
      res.json(profile);
    } catch (e) { next(e); }
  },
};
