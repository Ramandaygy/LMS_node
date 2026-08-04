const express = require('express');

const router = express.Router();

const gradeController = require(
  '../controllers/gradeController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  gradeController.getAllGrades
);

router.post(
  '/',
  authMiddleware,
  gradeController.createGrade
);

router.get(
  '/rekap/class/:classId',
  authMiddleware,
  gradeController.getClassRekapGrades
);

module.exports = router;