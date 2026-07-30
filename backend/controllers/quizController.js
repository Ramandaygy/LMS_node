const QuizBank = require('../models/QuizBank');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// GET ALL QUIZZES (For Guru or Siswa)
exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await QuizBank.find().sort({ createdAt: -1 });
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat data Quiz.' });
  }
};

// GET MASTER QUIZZES (Bank Quiz Guru)
exports.getMasterQuizzes = async (req, res) => {
  try {
    const quizzes = await QuizBank.find({ is_master: true }).sort({ createdAt: -1 });
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Error fetching master quizzes:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat Bank Master Quiz.' });
  }
};

// CREATE QUIZ (Master / Session)
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, subject_name, grade_level, questions, class_id, class_name, session_number, is_master } = req.body;
    const teacherId = req.user.id || req.user._id;

    const quiz = new QuizBank({
      title,
      description: description || '',
      subject_name: subject_name || 'Informatika',
      grade_level: grade_level || '8',
      teacher: teacherId,
      class_id: class_id || null,
      class_name: class_name || '',
      session_number: parseInt(session_number) || 1,
      is_master: is_master !== undefined ? is_master : true,
      questions: questions || []
    });

    await quiz.save();
    return res.status(201).json({ success: true, message: 'Berhasil membuat Paket Quiz Baru!', quiz });
  } catch (err) {
    console.error('Error creating quiz:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat Paket Quiz.' });
  }
};

// DISTRIBUTE / PUBLISH QUIZ TO CLASS & SESSION
exports.distributeQuiz = async (req, res) => {
  try {
    const { master_quiz_id, class_id, session_number } = req.body;
    const teacherId = req.user.id || req.user._id;

    let masterQuiz = null;
    if (master_quiz_id) {
      masterQuiz = await QuizBank.findById(master_quiz_id);
    }

    if (!masterQuiz) {
      return res.status(404).json({ success: false, message: 'Paket Master Quiz tidak ditemukan.' });
    }

    const classCol = mongoose.connection.collection('classes');
    let classObj = null;
    let classNameStr = req.body.class_name || 'Kelas';

    if (class_id && mongoose.Types.ObjectId.isValid(class_id.toString())) {
      classObj = await classCol.findOne({ _id: new mongoose.Types.ObjectId(class_id.toString()) });
      if (classObj) classNameStr = classObj.name;
    } else if (typeof class_id === 'string') {
      classNameStr = class_id;
    }

    const newPublishedQuiz = new QuizBank({
      title: masterQuiz.title,
      description: masterQuiz.description || '',
      subject_name: masterQuiz.subject_name,
      grade_level: masterQuiz.grade_level,
      teacher: teacherId,
      class_id: classObj ? classObj._id : class_id,
      class_name: classNameStr,
      session_number: parseInt(session_number) || 1,
      is_master: false,
      is_active: true,
      questions: masterQuiz.questions || []
    });

    await newPublishedQuiz.save();

    return res.json({
      success: true,
      message: `Berhasil sematkan Live Quiz ke Kelas ${classNameStr} Sesi ke-${session_number || 1}!`,
      quiz: newPublishedQuiz
    });
  } catch (err) {
    console.error('Error distributing quiz:', err);
    return res.status(500).json({ success: false, message: 'Gagal menyematkan Live Quiz ke kelas.' });
  }
};

// UPDATE QUIZ
exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await QuizBank.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, message: 'Berhasil memperbarui Quiz.', quiz });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui Quiz.' });
  }
};

// DELETE QUIZ
exports.deleteQuiz = async (req, res) => {
  try {
    await QuizBank.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Berhasil menghapus Paket Quiz.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus Paket Quiz.' });
  }
};

// AI GENERATE QUIZ
exports.generateQuizAI = async (req, res) => {
  try {
    const { topic, subject_name, num_questions, material_id } = req.body;
    let contextTopic = topic || 'Informatika Dasar';

    // If material_id is provided, pull text/title from Material!
    if (material_id) {
      const Material = require('../models/Material');
      const mat = await Material.findById(material_id);
      if (mat) {
        contextTopic = `Materi: "${mat.title}". Deskripsi: "${mat.description || ''}". Konten: "${(mat.content || '').slice(0, 500)}"`;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        success: true,
        questions: [
          { question_text: `Apa pengertian utama dari ${topic || 'materi ini'}?`, answer: 'Prinsip dasar dan fungsi utamanya.', options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'], correct_option: 0, points: 10, time_limit_seconds: 30 },
          { question_text: `Sebutkan salah satu contoh penerapan ${topic || 'materi'}!`, answer: 'Penerapan pada sistem kehidupan/komputer.', options: ['Opsi 1', 'Opsi 2', 'Opsi 3', 'Opsi 4'], correct_option: 1, points: 10, time_limit_seconds: 30 }
        ]
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const promptText = `Buatlah ${num_questions || 5} soal kuis pilihan ganda singkat mengenai "${contextTopic}" untuk mata pelajaran "${subject_name || 'Informatika'}".
Output murni JSON array:
[
  {
    "question_text": "Pertanyaan kuis...",
    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "correct_option": 0,
    "answer": "Penjelasan/Kunci singkat",
    "points": 10,
    "time_limit_seconds": 30
  }
]`;

    const result = await model.generateContent(promptText);
    let text = result.response.text().trim();
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);

    return res.json({ success: true, questions: parsed });
  } catch (err) {
    console.error('Error generating AI quiz:', err);
    return res.json({
      success: true,
      questions: [
        { question_text: `Apa tujuan utama dari ${req.body.topic || 'materi ini'}?`, answer: 'Memahami dasar konsep.', options: ['Jawaban A', 'Jawaban B', 'Jawaban C', 'Jawaban D'], correct_option: 0, points: 10, time_limit_seconds: 30 }
      ]
    });
  }
};

// SUBMIT QUIZ (SISWA)
exports.submitQuiz = async (req, res) => {
  try {
    const QuizSubmission = require('../models/QuizSubmission');
    const Grade = require('../models/Grade');
    const { quiz_id, answers } = req.body;
    const studentId = req.user.id || req.user._id;

    const quiz = await QuizBank.findById(quiz_id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Kuis tidak ditemukan.' });

    let totalPoints = 0;
    let maxPoints = 0;
    const processedAnswers = [];

    (quiz.questions || []).forEach((q, idx) => {
      const qPts = q.points || 10;
      maxPoints += qPts;
      const studentAns = answers && answers[idx] !== undefined ? answers[idx] : -1;
      const isCorrect = Number(studentAns) === Number(q.correct_option);
      if (isCorrect) totalPoints += qPts;

      processedAnswers.push({
        question_index: idx,
        selected_option: studentAns,
        is_correct: isCorrect,
        points_earned: isCorrect ? qPts : 0
      });
    });

    const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
    let starRating = 1;
    if (percentage >= 90) starRating = 5;
    else if (percentage >= 75) starRating = 4;
    else if (percentage >= 60) starRating = 3;
    else if (percentage >= 45) starRating = 2;

    const submission = new QuizSubmission({
      quiz_id,
      student_id: studentId,
      student_name: req.user.full_name || 'Siswa',
      nisn: req.user.nisn || req.user.nis || '',
      class_name: quiz.class_name || 'Kelas',
      session_number: quiz.session_number || 1,
      answers: processedAnswers,
      total_score: Math.round(percentage),
      max_score: 100,
      star_rating: starRating
    });

    await submission.save();

    // Auto save to Grade ledger
    await Grade.create({
      student: studentId,
      score: Math.round(percentage),
      type: 'quiz',
      note: `Quiz Sesi ${quiz.session_number}: ${quiz.title} (${starRating} Bintang ⭐)`
    }).catch(err => console.error('Auto grade error:', err));

    return res.json({
      success: true,
      message: 'Kuis berhasil dikumpulkan!',
      score: Math.round(percentage),
      star_rating: starRating,
      submission
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengumpulkan jawaban kuis.' });
  }
};

// GET QUIZ SUBMISSIONS (For Teacher or Class Leaderboard)
exports.getQuizSubmissions = async (req, res) => {
  try {
    const QuizSubmission = require('../models/QuizSubmission');
    const { quiz_id } = req.params;
    const submissions = await QuizSubmission.find({ quiz_id }).sort({ total_score: -1 });
    return res.json({ success: true, submissions });
  } catch (err) {
    console.error('Error fetching quiz submissions:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat hasil kuis siswa.' });
  }
};

