const { Router } = require('express');
const { authenticate } = require('../utils/authMiddleware');
const { handleUpload, listUploads, deleteUpload } = require('../controllers/uploadController');

module.exports = function uploadRoutes(upload) {
  const router = Router();
  router.get('/', authenticate, listUploads);
  router.post('/', authenticate, upload.single('file'), handleUpload);
  router.delete('/:uploadId', authenticate, deleteUpload);
  return router;
};
