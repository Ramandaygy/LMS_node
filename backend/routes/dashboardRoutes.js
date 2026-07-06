const express = require('express');

const router = express.Router();

const dashboardController = require('../controllers/dashboardController');

const authMiddleware = require('../middleware/authMiddleware');

router.get(
  '/stats',
  authMiddleware,
  dashboardController.getDashboardStats
);

router.get(
  '/activities',
  authMiddleware,
  dashboardController.getActivityLogs
);

module.exports = router;