import { Router } from 'express';
import { authenticate } from '../utils/authMiddleware.js';
import { handleUpload, listUploads, deleteUpload } from '../controllers/uploadController.js';

export default function uploadRoutes(upload) {
  const router = Router();
  router.get('/', authenticate, listUploads);
  router.post('/', authenticate, upload.single('file'), handleUpload);
  router.delete('/:uploadId', authenticate, deleteUpload);
  return router;
}
