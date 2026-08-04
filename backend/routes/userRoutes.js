const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// ======================================
// GET STUDENTS
// ======================================
router.get(
  '/students/all',
  authMiddleware,
  userController.getStudents
);

// ======================================
// GET STUDENT DETAIL WITH PARENT & CLASS
// ======================================
router.get(
  '/students/:id/detail',
  authMiddleware,
  userController.getStudentDetail
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
// GET ALL USERS
// ======================================
router.get(
  '/',
  authMiddleware,
  userController.getAllUsers
);

// ======================================
// PARENTS ROUTES
// ======================================
router.get(
  '/parents',
  authMiddleware,
  userController.getAllParents
);
router.post(
  '/parents',
  authMiddleware,
  userController.createParent
);
router.put(
  '/parents/:id',
  authMiddleware,
  userController.updateParent
);
router.delete(
  '/parents/:id',
  authMiddleware,
  userController.deleteParent
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