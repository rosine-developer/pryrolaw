import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { ClientsController } from '../controllers/clients.controller';

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['INDIVIDUAL', 'ORGANIZATION']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', ClientsController.list);
router.get('/:id', ClientsController.getById);
router.post('/', validate(clientSchema), ClientsController.create);
router.put('/:id', ClientsController.update);
router.delete('/:id', ClientsController.delete);

export default router;
