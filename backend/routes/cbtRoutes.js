const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage() });

const cbtController = require('../controllers/cbtController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/exams', cbtController.getExams);
router.get('/template-excel', cbtController.downloadTemplateExcel);
router.post('/import-questions', uploadMemory.single('file'), cbtController.importQuestionsExcel);
router.get('/exams/:id/export-excel', cbtController.exportExamExcel);

router.get('/exams/:id', cbtController.getExamById);
router.post('/exams', cbtController.createExam);
router.put('/exams/:id', cbtController.updateExam);
router.delete('/exams/:id', cbtController.deleteExam);

router.post('/distribute', cbtController.distributeExam);
router.post('/submit', cbtController.submitExam);
router.get('/exams/:id/results', cbtController.getExamResultsForGuru);

module.exports = router;
