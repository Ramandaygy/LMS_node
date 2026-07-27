const express = require('express');
const router = express.Router();
const cbtController = require('../controllers/cbtController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/exams', cbtController.getExams);
router.get('/exams/:id', cbtController.getExamById);
router.post('/exams', cbtController.createExam);
router.put('/exams/:id', cbtController.updateExam);
router.delete('/exams/:id', cbtController.deleteExam);

router.post('/submit', cbtController.submitExam);
router.get('/exams/:id/results', cbtController.getExamResultsForGuru);

module.exports = router;
