const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const { uploadSubmission } = require('../middleware/uploadMiddleware');
//
// Assignment routes
router.get('/', authMiddleware, assignmentController.getAllAssignments);
router.post('/', authMiddleware, uploadSubmission.array('attachments'), assignmentController.createAssignment);
router.get('/:id', authMiddleware, assignmentController.getAssignmentById);
router.put('/:id', authMiddleware, uploadSubmission.array('attachments'), assignmentController.updateAssignment);
router.delete('/:id', authMiddleware, assignmentController.deleteAssignment);

// Guru: tugas yang dibuat
router.get('/guru/me', authMiddleware, assignmentController.getTeacherAssignments);

// Siswa: tugas untuk kelasnya
router.get('/siswa/me', authMiddleware, assignmentController.getStudentAssignments);

// Ortu: tugas anak
router.get('/ortu/children/:childId', authMiddleware, assignmentController.getOrtuAssignments);

// ========== SUBMISSION ROUTES ==========
// Submit tugas siswa
router.post('/:assignmentId/submit', authMiddleware, uploadSubmission.single('file'), submissionController.submitAssignment);
// Lihat submisi assignment
router.get('/:assignmentId/submissions', authMiddleware, submissionController.getAssignmentSubmissions);

// Beri nilai
router.post('/:assignmentId/grade', authMiddleware, submissionController.gradeSubmission);

module.exports = router;