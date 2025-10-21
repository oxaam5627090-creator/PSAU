const express = require('express');
const authenticate = require('../utils/authMiddleware');
const { handleUpload, listUploads } = require('../controllers/uploadController');

const router = express.Router();

router.use(authenticate);
router.post('/', handleUpload);
router.get('/', listUploads);

module.exports = router;
