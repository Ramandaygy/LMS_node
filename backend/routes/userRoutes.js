const express = require('express');

const router = express.Router();

const userController =
  require('../controllers/userController');

const authMiddleware =
  require('../middleware/authMiddleware');

// ======================================
// GET ALL USERS
// ======================================
router.get(
  '/',
  authMiddleware,
  userController.getAllUsers
);

// ======================================
// GET USER BY ID
// ======================================
router.get(
  '/:id',
  authMiddleware,
  userController.getUserById
);

// ======================================
// GET STUDENTS
// ======================================
router.get(
  '/students/all',
  authMiddleware,
  userController.getStudents
);

// ======================================
// GET TEACHERS
// ======================================
router.get(
  '/teachers/all',
  authMiddleware,
  userController.getTeachers
);

// ======================================
// CREATE USER
// ======================================
router.post(
  '/',
  authMiddleware,
  userController.createUser
);

// ======================================
// UPDATE USER
// ======================================
router.put(
  '/:id',
  authMiddleware,
  userController.updateUser
);

// ======================================
// DELETE USER
// ======================================
router.delete(
  '/:id',
  authMiddleware,
  userController.deleteUser
);

module.exports = router;