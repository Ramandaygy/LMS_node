const express = require('express');
const router = express.Router();
const guruController = require('../controllers/guruController');
const authMiddleware = require('../middleware/authMiddleware');

// GET SISWA BINAAN
router.get('/students', authMiddleware, guruController.getBinaanStudents);

// POST INPUT NILAI UTS/UAS
router.post('/grades/input', authMiddleware, guruController.inputGrade);

// GET GRADES BY STUDENT
router.get('/students/:id/grades', authMiddleware, guruController.getStudentGrades);

module.exports = router;
