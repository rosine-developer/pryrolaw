import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { ProfileController } from '../controllers/profile.controller';

const router = Router();
router.use(authenticate);

router.get('/', ProfileController.get);
router.put('/', ProfileController.update);

export default router;
