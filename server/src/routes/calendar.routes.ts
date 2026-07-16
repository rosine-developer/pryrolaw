import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { CalendarController } from '../controllers/calendar.controller';

const router = Router();
router.use(authenticate);

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventType: z.enum(['HEARING', 'MEETING', 'FILING_DEADLINE', 'REMINDER', 'OTHER']),
  location: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  reminderMinutes: z.number().optional(),
  caseId: z.string().uuid().optional(),
});

router.get('/', CalendarController.list);
router.get('/upcoming', CalendarController.upcoming);
router.get('/:id', CalendarController.getById);
router.post('/', validate(eventSchema), CalendarController.create);
router.put('/:id', CalendarController.update);
router.delete('/:id', CalendarController.delete);

export default router;
