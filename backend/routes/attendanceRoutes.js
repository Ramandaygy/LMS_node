const express = require('express');

const router = express.Router();

const attendanceController = require(
  '../controllers/attendanceController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  attendanceController.getAllAttendance
);

router.post(
  '/',
  authMiddleware,
  attendanceController.createAttendance
);

module.exports = router;