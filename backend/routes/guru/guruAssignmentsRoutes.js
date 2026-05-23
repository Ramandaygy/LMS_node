const express = require('express');
const router = express.Router();
const assignmentsController = require('../../controllers/guru/assignmentsController');
const { uploadAttachments } = require('../../utils/fileUpload');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

// Semua route hanya untuk guru
router.use(auth, allowRoles('guru'));

router.get('/', assignmentsController.getAssignments);
router.post('/', uploadAttachments, assignmentsController.createAssignment);
router.put('/:assignment_id', uploadAttachments, assignmentsController.updateAssignment);
router.delete('/:assignment_id', assignmentsController.deleteAssignment);
router.get('/:assignment_id/submissions', assignmentsController.getSubmissions);
router.post('/:assignment_id/grade', assignmentsController.gradeSubmission);
router.get('/profile', assignmentsController.getTeacherProfile);
router.get('/uploads/assignments/:filename', assignmentsController.serveAssignmentFile);

module.exports = router;