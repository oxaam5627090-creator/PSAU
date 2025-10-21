const express = require('express');
const authenticate = require('../utils/authMiddleware');
const { getOverview, listTrainingFiles } = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate);
router.get('/overview', getOverview);
router.get('/training-files', listTrainingFiles);

module.exports = router;
