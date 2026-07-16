import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate';
import { DocumentsController } from '../controllers/documents.controller';

const router = Router();
router.use(authenticate);

// Multer config — store uploads on disk with unique filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed.`));
    }
  },
});

router.get('/', DocumentsController.list);
router.get('/:id', DocumentsController.getById);
router.post('/', upload.single('file'), DocumentsController.create);
router.put('/:id', DocumentsController.update);
router.delete('/:id', DocumentsController.delete);
router.post('/:id/versions', upload.single('file'), DocumentsController.addVersion);

export default router;
