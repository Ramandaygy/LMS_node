const express = require('express');

const router = express.Router();

const assignmentController = require(
  '../controllers/assignmentController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  assignmentController.getAllAssignments
);

router.post(
  '/',
  authMiddleware,
  assignmentController.createAssignment
);

module.exports = router;