const express = require('express');

const router = express.Router();

const classController = require(
  '../controllers/classController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

// ======================================
// GET ALL CLASSES
// ======================================
router.get(
  '/',
  authMiddleware,
  classController.getAllClasses
);

// ======================================
// GET CLASS BY ID
// ======================================
router.get(
  '/:id',
  authMiddleware,
  classController.getClassById
);

// ======================================
// CREATE CLASS
// ======================================
router.post(
  '/',
  authMiddleware,
  classController.createClass
);

// ======================================
// UPDATE CLASS
// ======================================
router.put(
  '/:id',
  authMiddleware,
  classController.updateClass
);

// ======================================
// DELETE CLASS
// ======================================
router.delete(
  '/:id',
  authMiddleware,
  classController.deleteClass
);

module.exports = router;