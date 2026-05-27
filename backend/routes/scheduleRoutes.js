const express = require('express');

const router = express.Router();

const scheduleController = require(
  '../controllers/scheduleController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  scheduleController.getAllSchedules
);

router.post(
  '/',
  authMiddleware,
  scheduleController.createSchedule
);

module.exports = router;