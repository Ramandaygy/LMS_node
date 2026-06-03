const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const upload = require('../middleware/uploadMiddleware'); // pastikan file ini ada

// Assignment routes
router.get('/', authMiddleware, assignmentController.getAllAssignments);
router.post('/', authMiddleware, assignmentController.createAssignment);
router.get('/:id', authMiddleware, assignmentController.getAssignmentById);
router.put('/:id', authMiddleware, assignmentController.updateAssignment);
router.delete('/:id', authMiddleware, assignmentController.deleteAssignment);

// Guru: tugas yang dibuat
router.get('/guru/me', authMiddleware, assignmentController.getTeacherAssignments);

// Siswa: tugas untuk kelasnya
router.get('/siswa/me', authMiddleware, assignmentController.getStudentAssignments);

// ========== SUBMISSION ROUTES ==========
router.post('/:assignmentId/submit', authMiddleware, upload.single('file'), submissionController.submitAssignment);
router.get('/:assignmentId/submissions', authMiddleware, submissionController.getAssignmentSubmissions);
router.post('/:assignmentId/grade', authMiddleware, submissionController.gradeSubmission);

module.exports = router;