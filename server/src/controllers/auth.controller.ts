import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export const AuthController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName } = req.body;
      const result = await AuthService.register(email, password, fullName);
      res.status(201).json(result);
    } catch (e) { next(e); }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (e) { next(e); }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refresh(refreshToken);
      res.json(tokens);
    } catch (e) { next(e); }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await AuthService.logout(refreshToken);
      res.json({ message: 'Logged out successfully.' });
    } catch (e) { next(e); }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);
      res.status(200).json({ message: 'Password reset successfully.' });
    } catch (e) { next(e); }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const { prisma } = await import('../lib/prisma');
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { profile: true },
      });
      if (!user) { res.status(404).json({ error: 'User not found.' }); return; }
      res.json({
        id: user.id,
        email: user.email,
        profile: user.profile,
        createdAt: user.createdAt,
      });
    } catch (e) { next(e); }
  },
};
