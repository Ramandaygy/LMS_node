const express = require('express');
const router = express.Router();

const quizController = require('../controllers/quizController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// SEMUA ROUTE PAKAI authMiddleware
// ============================================================
router.use(authMiddleware);

// ============================================================
// ROUTES UNTUK GURU
// ============================================================

// GET - Ambil semua quiz (filter by teacher)
router.get('/', quizController.getQuizzes);

// GET - Ambil master quiz (filter by teacher)
router.get('/master', quizController.getMasterQuizzes);

// POST - Buat master quiz baru
router.post('/master', quizController.createQuiz);

// POST - Distribusikan quiz ke kelas
router.post('/distribute', quizController.distributeQuiz);

// POST - Generate AI quiz
router.post('/generate-ai', quizController.generateQuizAI);

// PUT - Update quiz
router.put('/:id', quizController.updateQuiz);

// DELETE - Delete quiz
router.delete('/:id', quizController.deleteQuiz);

// GET - Ambil submissions quiz (filter by teacher)
router.get('/:quiz_id/submissions', quizController.getQuizSubmissions);

// ============================================================
// 🔥 ROUTES UNTUK SISWA
// ============================================================

// GET - Ambil quiz untuk siswa (filter by class & is_active)
router.get('/siswa', quizController.getQuizzesForSiswa);

// POST - Submit quiz (siswa)
router.post('/submit', quizController.submitQuiz);

module.exports = router;