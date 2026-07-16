import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export const DashboardController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getSummary(req.userId);
      res.json(data);
    } catch (e) { next(e); }
  },
};
