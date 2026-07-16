import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { TasksController } from '../controllers/tasks.controller';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  caseId: z.string().uuid().optional(),
});

router.get('/', TasksController.list);
router.get('/:id', TasksController.getById);
router.post('/', validate(taskSchema), TasksController.create);
router.put('/:id', TasksController.update);
router.delete('/:id', TasksController.delete);

export default router;
