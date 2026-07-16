import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { AIController } from '../controllers/ai.controller';

const router = Router();
router.use(authenticate);

const createConvSchema = z.object({
  title: z.string().min(1),
  caseId: z.string().uuid().optional(),
});

const messageSchema = z.object({
  content: z.string().min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
});

router.get('/providers', AIController.getProviders);
router.get('/conversations', AIController.listConversations);
router.get('/conversations/:id', AIController.getConversation);
router.post('/conversations', validate(createConvSchema), AIController.createConversation);
router.delete('/conversations/:id', AIController.deleteConversation);
router.post('/conversations/:id/messages', validate(messageSchema), AIController.sendMessage);

export default router;
