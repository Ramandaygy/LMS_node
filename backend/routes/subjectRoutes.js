const express = require('express');

const router = express.Router();

const subjectController = require(
  '../controllers/subjectController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  subjectController.getAllSubjects
);

router.get(
  '/:id',
  authMiddleware,
  subjectController.getSubjectById
);

router.post(
  '/',
  authMiddleware,
  subjectController.createSubject
);

router.put(
  '/:id',
  authMiddleware,
  subjectController.updateSubject
);

router.delete(
  '/:id',
  authMiddleware,
  subjectController.deleteSubject
);

module.exports = router;