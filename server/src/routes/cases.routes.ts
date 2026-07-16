import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { CasesController } from '../controllers/cases.controller';

const router = Router();
router.use(authenticate);

const createCaseSchema = z.object({
  title: z.string().min(1),
  caseNumber: z.string().min(1),
  caseType: z.string().min(1),
  jurisdiction: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'ON_HOLD', 'CLOSED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  opposingParty: z.string().optional(),
  assignedLawyer: z.string().optional(),
  clientId: z.string().uuid().optional(),
});

const noteSchema = z.object({ content: z.string().min(1) });

const timelineSchema = z.object({
  eventType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  eventDate: z.string().min(1),
});

router.get('/', CasesController.list);
router.get('/:id', CasesController.getById);
router.post('/', validate(createCaseSchema), CasesController.create);
router.put('/:id', CasesController.update);
router.delete('/:id', CasesController.delete);

// Notes
router.get('/:id/notes', CasesController.getNotes);
router.post('/:id/notes', validate(noteSchema), CasesController.createNote);
router.delete('/:id/notes/:noteId', CasesController.deleteNote);

// Timeline
router.get('/:id/timeline', CasesController.getTimeline);
router.post('/:id/timeline', validate(timelineSchema), CasesController.createTimelineEvent);
router.delete('/:id/timeline/:eventId', CasesController.deleteTimelineEvent);

export default router;
