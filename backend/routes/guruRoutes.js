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

// BULK GRADES BY CLASS
router.get('/grades/class', authMiddleware, guruController.getClassGrades);
router.post('/grades/class/save', authMiddleware, guruController.saveClassGrades);

// GET HOMEROOM STATUS (HIDE & SEE)
router.get('/homeroom-status', authMiddleware, guruController.getHomeroomStatus);

// GET WALI KELAS OVERVIEW
router.get('/walikelas/overview', authMiddleware, guruController.getWaliKelasOverview);

module.exports = router;

