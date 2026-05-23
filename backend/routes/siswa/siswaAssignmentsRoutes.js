const express = require('express');
const router = express.Router();
const assignmentsController = require('../../controllers/siswa/assignmentsController');
const { uploadSubmission } = require('../../utils/submissionUpload');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('siswa'));

router.get('/', assignmentsController.getMyAssignments);
router.post('/:assignment_id/submit', uploadSubmission, assignmentsController.submitAssignment);
router.get('/uploads/assignments/:filename', assignmentsController.serveAssignmentFile);

module.exports = router;