import { Request, Response, NextFunction } from 'express';
import { DocumentsService } from '../services/documents.service';
import { DocumentCategory, DocumentStatus } from '@prisma/client';
import path from 'path';

export const DocumentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { caseId, category, status, search, page, limit } = req.query;
      const result = await DocumentsService.list(req.userId, {
        caseId: caseId as string | undefined,
        category: category as DocumentCategory | undefined,
        status: status as DocumentStatus | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await DocumentsService.getById(req.params.id, req.userId);
      res.json(doc);
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // If a file was uploaded via multer, attach storage info
      const file = (req as any).file as Express.Multer.File | undefined;
      const data = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        fileType: file ? path.extname(file.originalname).slice(1).toLowerCase() : req.body.fileType,
        fileSize: file ? file.size : req.body.fileSize ? Number(req.body.fileSize) : undefined,
        storagePath: file ? `uploads/${file.filename}` : req.body.storagePath,
      };
      const doc = await DocumentsService.create(req.userId, data);
      res.status(201).json(doc);
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      };
      const doc = await DocumentsService.update(req.params.id, req.userId, data);
      res.json(doc);
    } catch (e) { next(e); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await DocumentsService.delete(req.params.id, req.userId);
      res.json({ message: 'Document deleted.' });
    } catch (e) { next(e); }
  },

  async addVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      const version = await DocumentsService.addVersion(req.params.id, req.userId, {
        storagePath: file ? `uploads/${file.filename}` : req.body.storagePath,
        fileSize: file ? file.size : req.body.fileSize ? Number(req.body.fileSize) : undefined,
        changeNote: req.body.changeNote,
      });
      res.status(201).json(version);
    } catch (e) { next(e); }
  },
};
