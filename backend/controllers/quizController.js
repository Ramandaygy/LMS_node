const QuizBank = require('../models/QuizBank');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ============================================================
// GET ALL QUIZZES - FILTER BY TEACHER
// ============================================================
exports.getQuizzes = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    const mongoose = require('mongoose');
    const teacherConditions = [teacherId.toString()];
    if (mongoose.Types.ObjectId.isValid(teacherId.toString())) {
      teacherConditions.push(new mongoose.Types.ObjectId(teacherId.toString()));
    }
    
    const quizzes = await QuizBank.find({ 
      teacher: { $in: teacherConditions }
    }).sort({ createdAt: -1 });
    
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat data Quiz.' });
  }
};

// ============================================================
// GET MASTER QUIZZES - FILTER BY TEACHER
// ============================================================
exports.getMasterQuizzes = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    const mongoose = require('mongoose');
    const teacherConditions = [teacherId.toString()];
    if (mongoose.Types.ObjectId.isValid(teacherId.toString())) {
      teacherConditions.push(new mongoose.Types.ObjectId(teacherId.toString()));
    }
    
    const quizzes = await QuizBank.find({ 
      is_master: true,
      teacher: { $in: teacherConditions }
    }).sort({ createdAt: -1 });
    
    return res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Error fetching master quizzes:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat Bank Master Quiz.' });
  }
};

// ============================================================
// GET QUIZZES FOR SISWA - FILTER BY CLASS & ACTIVE
// ============================================================
exports.getQuizzesForSiswa = async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;
    
    const User = require('../models/User');
    let student = await User.findById(studentId).lean();
    
    if (!student) {
      const siswaCol = mongoose.connection.collection('users_siswa');
      student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(studentId.toString()) });
    }
    
    const studentClass = student?.class_name || '';
    const studentClassId = student?.class_id || '';
    
    let classConditions = [];
    if (studentClass && studentClass.trim()) {
      classConditions.push({ class_name: { $regex: new RegExp(studentClass.trim(), 'i') } });
    }
    if (studentClassId) {
      const classIdStr = studentClassId.toString();
      let classIdObj;
      try {
        classIdObj = new mongoose.Types.ObjectId(classIdStr);
      } catch (e) {
        classIdObj = studentClassId;
      }
      classConditions.push({ class_id: classIdStr });
      classConditions.push({ class_id: classIdObj });
    }

    if (classConditions.length === 0) {
      return res.json({ success: true, quizzes: [] });
    }

    const quizzes = await QuizBank.find({
      is_master: false,
      is_active: true,
      $or: classConditions
    }).sort({ createdAt: -1 });
    
    const QuizSubmission = require('../models/QuizSubmission');
    const mongoose = require('mongoose');
    const studentConditions = [studentId.toString()];
    if (mongoose.Types.ObjectId.isValid(studentId.toString())) {
      studentConditions.push(new mongoose.Types.ObjectId(studentId.toString()));
    }

    const submittedQuizIds = await QuizSubmission.distinct('quiz_id', {
      student_id: { $in: studentConditions }
    });
    
    const submittedSet = new Set(submittedQuizIds.map(id => id.toString()));
    
    const quizzesWithStatus = quizzes.map(q => ({
      ...q.toObject(),
      is_submitted: submittedSet.has(q._id.toString())
    }));
    
    return res.json({ success: true, quizzes: quizzesWithStatus });
  } catch (err) {
    console.error('Error fetching quizzes for siswa:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat data kuis.' });
  }
};

// ============================================================
// CREATE QUIZ
// ============================================================
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

// ============================================================
// DISTRIBUTE QUIZ
// ============================================================
exports.distributeQuiz = async (req, res) => {
  try {
    const { master_quiz_id, class_id, session_number } = req.body;
    const teacherId = req.user.id || req.user._id;

    let masterQuiz = null;
    if (master_quiz_id) {
      masterQuiz = await QuizBank.findOne({ 
        _id: master_quiz_id,
        teacher: teacherId
      });
    }

    if (!masterQuiz) {
      return res.status(404).json({ success: false, message: 'Paket Master Quiz tidak ditemukan atau bukan milik Anda.' });
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

// ============================================================
// UPDATE QUIZ
// ============================================================
exports.updateQuiz = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    
    const existingQuiz = await QuizBank.findOne({
      _id: req.params.id,
      teacher: teacherId
    });
    
    if (!existingQuiz) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke quiz ini.' });
    }
    
    const quiz = await QuizBank.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, message: 'Berhasil memperbarui Quiz.', quiz });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui Quiz.' });
  }
};

// ============================================================
// DELETE QUIZ
// ============================================================
exports.deleteQuiz = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    
    const existingQuiz = await QuizBank.findOne({
      _id: req.params.id,
      teacher: teacherId
    });
    
    if (!existingQuiz) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke quiz ini.' });
    }
    
    await QuizBank.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Berhasil menghapus Paket Quiz.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus Paket Quiz.' });
  }
};

// ============================================================
// GET QUIZ SUBMISSIONS
// ============================================================
exports.getQuizSubmissions = async (req, res) => {
  try {
    const QuizSubmission = require('../models/QuizSubmission');
    const User = require('../models/User');
    const { quiz_id } = req.params;
    const teacherId = req.user.id || req.user._id;

    const quiz = await QuizBank.findOne({
      _id: quiz_id,
      teacher: teacherId
    });
    
    if (!quiz) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke quiz ini.' });
    }

    let quizIdsToSearch = [quiz_id];

    if (quiz.is_master) {
      const childQuizzes = await QuizBank.find({
        title: quiz.title,
        is_master: false,
        teacher: teacherId
      }).select('_id');
      quizIdsToSearch = childQuizzes.map(q => q._id);
      quizIdsToSearch.push(quiz_id);
    }

    const rawSubmissions = await QuizSubmission.find({ quiz_id: { $in: quizIdsToSearch } })
      .sort({ star_rating: -1, total_score: -1, createdAt: -1 })
      .lean();

    const studentIds = rawSubmissions.map(s => s.student_id).filter(Boolean);
    const objIds = studentIds.map(id => {
      try { return new mongoose.Types.ObjectId(id.toString()); } catch(e) { return id; }
    });

    const [mainUsers, siswaUsers] = await Promise.all([
      User.find({ _id: { $in: objIds } }).lean(),
      mongoose.connection.collection('users_siswa').find({ _id: { $in: objIds } }).toArray()
    ]);

    const studentMap = {};
    mainUsers.forEach(u => { studentMap[u._id.toString()] = u; });
    siswaUsers.forEach(s => { studentMap[s._id.toString()] = s; });

    const submissions = rawSubmissions.map(sub => {
      const sId = sub.student_id ? sub.student_id.toString() : '';
      const sInfo = studentMap[sId];
      let realName = sub.student_name;
      let realNis = sub.nisn;

      if ((!realName || realName === 'Siswa') && sInfo) {
        realName = sInfo.full_name || sInfo.name;
      }
      if ((!realNis || realNis === '-') && sInfo) {
        realNis = sInfo.nisn || sInfo.nis || sInfo.username || '';
      }

      return {
        ...sub,
        student_name: realName || 'Siswa',
        nisn: realNis || '-'
      };
    });

    return res.json({ success: true, submissions });
  } catch (err) {
    console.error('Error fetching quiz submissions:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat hasil kuis siswa.' });
  }
};

// ============================================================
// AI GENERATE QUIZ
// ============================================================
exports.generateQuizAI = async (req, res) => {
  try {
    const { topic, subject_name, num_questions, material_id } = req.body;
    let contextTopic = topic || 'Informatika Dasar';

    if (material_id) {
      const Material = require('../models/Material');
      const mat = await Material.findById(material_id);
      if (mat) {
        contextTopic = `Judul Dokumen: "${mat.title}". Deskripsi: "${mat.description || ''}". Isi Ringkasan: "${(mat.content || mat.title || '').slice(0, 800)}"`;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const count = Number(num_questions) || 5;
    const randomSeed = Math.floor(Math.random() * 10000);

    if (!apiKey) {
      const fallbackQuestions = [
        {
          question_text: `Apa konsep utama yang dipelajari pada ${topic || 'materi ini'}?`,
          answer: 'Memahami sintaks dasar dan alur logika eksekusi program.',
          options: ['Sintaks & Alur Eksekusi', 'Desain Grafis Animasi', 'Manajemen Server Cloud', 'Pengujian Perangkat Keras'],
          correct_option: 0,
          points: 10,
          time_limit_seconds: 30
        },
        {
          question_text: `Manakah komponen utama yang paling krusial pada ${topic || 'topik ini'}?`,
          answer: 'Struktur data pendukung dan fungsi logika.',
          options: ['Kabel Jaringan', 'Struktur Data & Fungsi Logika', 'Ukuran Layar Monitor', 'Kecepatan Printer'],
          correct_option: 1,
          points: 10,
          time_limit_seconds: 30
        },
        {
          question_text: `Apa fungsi dari instruksi atau metode dasar pada ${topic || 'materi ini'}?`,
          answer: 'Memproses masukan data menjadi keluaran yang valid.',
          options: ['Menghapus sistem operasi', 'Menutup koneksi internet', 'Memproses masukan data menjadi keluaran valid', 'Mengunci layar komputer'],
          correct_option: 2,
          points: 10,
          time_limit_seconds: 30
        },
        {
          question_text: `Mengapa penerapan ${topic || 'materi ini'} sangat penting dalam sistem komputer?`,
          answer: 'Meningkatkan efisiensi kerja dan mengurangi risiko kesalahan logika.',
          options: ['Agar komputer lebih berat', 'Meningkatkan efisiensi kerja & mengurangi kesalahan logika', 'Menambah daya listrik', 'Mengganti komponen memori'],
          correct_option: 1,
          points: 10,
          time_limit_seconds: 30
        },
        {
          question_text: `Bagaimana alur penyelesaian masalah yang paling tepat pada ${topic || 'materi ini'}?`,
          answer: 'Analisis masalah -> Perancangan solusi -> Implementasi -> Pengujian.',
          options: ['Pengujian -> Analisis -> Hapus', 'Analisis -> Perancangan -> Implementasi -> Pengujian', 'Implementasi -> Abaikan -> Selesai', 'Perancangan saja'],
          correct_option: 1,
          points: 10,
          time_limit_seconds: 30
        }
      ];
      return res.json({ success: true, questions: fallbackQuestions.slice(0, count) });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const promptText = `Anda adalah pembuat kuis profesional. Buatlah ${count} soal kuis pilihan ganda yang SANGAT BERVARIASI, UNIK, dan BERBEDA SATU SAMA LAIN mengenai "${contextTopic}" untuk mata pelajaran "${subject_name || 'Informatika'}".
Seed variasi: ${randomSeed}.

PENTING:
- Setiap soal HARUS membahas aspek yang berbeda (misal: definisi, fungsi, contoh penerapan, sintaks/komponen, dan analisis kasus).
- JANGAN ADA SOAL YANG DUPLIKAT ATAU MIRIP!
- Berikan 4 pilihan jawaban unik (A, B, C, D) untuk setiap soal.
- Tentukan indeks kunci jawaban benar (correct_option: 0 untuk A, 1 untuk B, 2 untuk C, 3 untuk D).

Output Wajib murni JSON array tanpa format markdown apapun:
[
  {
    "question_text": "Teks pertanyaan 1 yang unik...",
    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "correct_option": 0,
    "answer": "Kunci jawaban & penjelasan singkat...",
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
        {
          question_text: `Apa tujuan utama dari mempelajari topik "${req.body.topic || 'materi ini'}"?`,
          answer: 'Memahami konsep dasar dan implementasi praktisnya.',
          options: [
            'Memahami konsep dasar dan implementasi praktisnya',
            'Menghindari materi pelajaran tersebut',
            'Hanya menghafal istilah tanpa pemahaman',
            'Tidak ada tujuan yang benar'
          ],
          correct_option: 0,
          points: 10,
          time_limit_seconds: 30
        },
        {
          question_text: `Bagaimana langkah terbaik untuk menguasai topik "${req.body.topic || 'materi ini'}"?`,
          answer: 'Mempelajari konsep secara sistematis dan berlatih soal.',
          options: [
            'Mengabaikan penjelasan guru di kelas',
            'Mempelajari konsep secara sistematis dan berlatih soal',
            'Belajar terburu-buru hanya sebelum ujian',
            'Menyalin tugas milik teman kelas'
          ],
          correct_option: 1,
          points: 10,
          time_limit_seconds: 30
        }
      ]
    });
  }
};

// ============================================================
// SUBMIT QUIZ (SISWA)
// ============================================================
exports.submitQuiz = async (req, res) => {
  try {
    const QuizSubmission = require('../models/QuizSubmission');
    const Grade = require('../models/Grade');
    const User = require('../models/User');
    const { quiz_id, answers } = req.body;
    const studentId = req.user.id || req.user._id;

    const quiz = await QuizBank.findById(quiz_id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Kuis tidak ditemukan.' });

    // Cek apakah siswa sudah submit quiz ini
    const mongoose = require('mongoose');
    const studentConditions = [studentId.toString()];
    if (mongoose.Types.ObjectId.isValid(studentId.toString())) {
      studentConditions.push(new mongoose.Types.ObjectId(studentId.toString()));
    }

    const existingSubmission = await QuizSubmission.findOne({
      quiz_id: quiz_id,
      student_id: { $in: studentConditions }
    });
    
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'Anda sudah mengerjakan kuis ini sebelumnya.' 
      });
    }

    let studentName = req.user.full_name || req.user.name;
    let studentNis = req.user.nisn || req.user.nis || '';

    if (!studentName || studentName === 'Siswa') {
      let studentDoc = await User.findById(studentId).lean();
      if (!studentDoc) {
        const siswaCol = mongoose.connection.collection('users_siswa');
        try {
          studentDoc = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(studentId.toString()) });
        } catch(e) {}
      }
      if (studentDoc) {
        studentName = studentDoc.full_name || studentDoc.name || 'Siswa';
        studentNis = studentDoc.nisn || studentDoc.nis || studentDoc.username || '';
      }
    }

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
      student_name: studentName || 'Siswa',
      nisn: studentNis || '-',
      class_name: quiz.class_name || 'Kelas',
      session_number: quiz.session_number || 1,
      answers: processedAnswers,
      total_score: Math.round(percentage),
      max_score: 100,
      star_rating: starRating
    });

    await submission.save();

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