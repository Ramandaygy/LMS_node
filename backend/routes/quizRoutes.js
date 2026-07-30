const express = require('express');
const router = express.Router();

const quizController = require('../controllers/quizController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', quizController.getQuizzes);
router.get('/master', quizController.getMasterQuizzes);
router.post('/master', quizController.createQuiz);
router.post('/distribute', quizController.distributeQuiz);
router.post('/generate-ai', quizController.generateQuizAI);
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

module.exports = router;
