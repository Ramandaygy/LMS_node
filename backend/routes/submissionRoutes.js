const express = require('express');

const router = express.Router();

const submissionController = require(
  '../controllers/submissionController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

// GET ALL
router.get(
  '/',
  authMiddleware,
  submissionController.getAllSubmissions
);

// GET BY ID
router.get(
  '/:id',
  authMiddleware,
  submissionController.getSubmissionById
);

// CREATE
router.post(
  '/',
  authMiddleware,
  submissionController.createSubmission
);

// UPDATE
router.put(
  '/:id',
  authMiddleware,
  submissionController.updateSubmission
);

// DELETE
router.delete(
  '/:id',
  authMiddleware,
  submissionController.deleteSubmission
);

module.exports = router;