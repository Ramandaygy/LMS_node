const express = require('express');

const router = express.Router();

const submissionController = require(
  '../controllers/submissionController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  submissionController.getAllSubmissions
);

router.get(
  '/:id',
  authMiddleware,
  submissionController.getSubmissionById
);

router.post(
  '/',
  authMiddleware,
  submissionController.createSubmission
);

module.exports = router;