const QuizBank = require('../models/QuizBank');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Material = require('../models/Material');

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
    const studentId = req.user?.id || req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const User = require('../models/User');
    const mongoose = require('mongoose');
    let student = await User.findById(studentId).lean();
    
    if (!student) {
      const siswaCol = mongoose.connection.collection('users_siswa');
      try {
        student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(studentId.toString()) });
      } catch (err) {
        student = null;
      }
    }
    
    let studentClass = student?.class_name || student?.class_id?.name || '';
    const studentClassId = student?.class_id?._id || student?.class_id || '';
    
    if (!studentClass && studentClassId) {
      const classCol = mongoose.connection.collection('classes');
      try {
        const clsObj = await classCol.findOne({ _id: new mongoose.Types.ObjectId(studentClassId.toString()) });
        if (clsObj) studentClass = clsObj.name;
      } catch (err) {
        console.error('Error fetching class in getQuizzesForSiswa:', err);
      }
    }

    let classConditions = [];
    if (studentClass && studentClass.trim()) {
      classConditions.push({ class_name: { $regex: new RegExp(studentClass.trim(), 'i') } });
      classConditions.push({ class_id: studentClass.trim() });
    }
    if (studentClassId) {
      const classIdStr = studentClassId.toString();
      let classIdObj;
      try {
        classIdObj = new mongoose.Types.ObjectId(classIdStr);
        classConditions.push({ class_id: classIdObj });
      } catch (e) {
        // ignore
      }
      classConditions.push({ class_id: classIdStr });
    }

    if (classConditions.length === 0) {
      return res.json({ success: true, quizzes: [] });
    }

    const quizzes = await QuizBank.find({
      is_master: false,
      is_active: true,
      $or: classConditions
    }).sort({ createdAt: -1 }).lean();
    
    const QuizSubmission = require('../models/QuizSubmission');
    const studentConditions = [studentId.toString()];
    try {
      studentConditions.push(new mongoose.Types.ObjectId(studentId.toString()));
    } catch (e) {}

    const submittedQuizIds = await QuizSubmission.distinct('quiz_id', {
      student_id: { $in: studentConditions }
    });
    
    const submittedSet = new Set(submittedQuizIds.map(id => id.toString()));
    
    const quizzesWithStatus = quizzes.map(q => ({
      ...q,
      is_submitted: submittedSet.has(q._id.toString())
    }));
    
    return res.json({ success: true, quizzes: quizzesWithStatus });
  } catch (err) {
    console.error('Error fetching quizzes for siswa:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat kuis live.' });
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
    const { material_id, subject_name, num_questions } = req.body;
    
    // Batasi jumlah soal (default 5, max 20)
    let count = parseInt(num_questions) || 5;
    if (count < 1) count = 1;
    if (count > 20) count = 20;

    let contextTopic = subject_name || 'Informatika';
    let topic = subject_name || 'Informatika';

    if (material_id) {
      let mat;
      try {
        mat = await Material.findById(material_id);
      } catch (e) {
        // jika bukan object id
        mat = await Material.findOne({ _id: material_id });
      }

      if (mat) {
        topic = mat.title || topic;
        // Ambil porsi besar dari konten materi (hingga 30.000 karakter) untuk dianalisis
        if (mat.content) {
          contextTopic = mat.content.slice(0, 30000);
        } else if (mat.description) {
          contextTopic = mat.description;
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const randomSeed = Math.floor(Math.random() * 10000);

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'API Key Gemini tidak ditemukan.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Menggunakan gemini-2.5-flash agar lebih stabil dari traffic tinggi
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const promptText = `Anda adalah pendidik dan pembuat kuis profesional. Buatlah ${count} soal kuis yang SANGAT SESUAI DENGAN MATERI BERIKUT:
"${contextTopic}"

Mata Pelajaran: "${subject_name || 'Informatika'}"
Seed variasi: ${randomSeed}.

PENTING:
- Soal HARUS didasarkan SECARA SPESIFIK pada informasi yang ada di materi di atas.
- JANGAN buat soal umum jika materi sudah cukup spesifik.
- Buat campuran tipe soal secara proporsional dari 3 tipe berikut: "pg" (Pilihan Ganda), "tf" (Benar/Salah), dan "matching" (Menjodohkan).
- Berikan 4 opsi untuk tipe "pg" dan pasangan yang masuk akal untuk "matching".
- Susun kalimat pertanyaan agar luwes, profesional, dan natural (tidak seperti robot memotong kalimat).

Format output WAJIB berupa murni JSON array tanpa blok markdown apapun:
[
  {
    "type": "pg",
    "question_text": "Pertanyaan PG...",
    "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
    "correct_option": 0,
    "points": 10
  },
  {
    "type": "tf",
    "question_text": "Pernyataan Benar atau Salah...",
    "correct_tf": true,
    "points": 10
  },
  {
    "type": "matching",
    "question_text": "Pasangkan istilah berikut...",
    "matching_pairs": [
      {"left": "Istilah 1", "right": "Arti 1"},
      {"left": "Istilah 2", "right": "Arti 2"}
    ],
    "points": 10
  }
]`;

    const result = await model.generateContent(promptText);
    let text = result.response.text().trim();
    
    // Gunakan regex untuk memastikan hanya array JSON yang diparsing
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      text = jsonMatch[0];
    } else {
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    }
    
    const parsed = JSON.parse(text);

    return res.json({ success: true, questions: parsed });
  } catch (err) {
    console.error('Error generating AI quiz:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat kuis AI: ' + err.message
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
      const studentAns = answers && answers[idx] !== undefined ? answers[idx] : null;
      
      let isCorrect = false;
      let pointsEarned = 0;
      let processedAns = {
        question_index: idx,
        selected_option: -1,
        selected_tf: null,
        matched_pairs: [],
        is_correct: false,
        points_earned: 0
      };

      if (studentAns !== null) {
        if (q.type === 'tf') {
          // TF Grading
          const ansTf = typeof studentAns === 'object' ? studentAns.selected_tf : studentAns;
          if (ansTf === q.correct_tf) {
            isCorrect = true;
            pointsEarned = qPts;
          }
          processedAns.selected_tf = ansTf;
        } else if (q.type === 'matching') {
          // Matching Grading (Partial points)
          const ansPairs = typeof studentAns === 'object' ? (studentAns.matched_pairs || []) : [];
          let correctCount = 0;
          let totalPairs = (q.matching_pairs || []).length;
          
          if (totalPairs > 0) {
            (q.matching_pairs || []).forEach(cp => {
              const studentPair = ansPairs.find(sp => sp.left === cp.left);
              if (studentPair && studentPair.right === cp.right) {
                correctCount++;
              }
            });
            pointsEarned = (correctCount / totalPairs) * qPts;
            if (correctCount === totalPairs) isCorrect = true;
          }
          processedAns.matched_pairs = ansPairs;
        } else {
          // PG Grading
          const ansOpt = typeof studentAns === 'object' ? studentAns.selected_option : Number(studentAns);
          if (Number(ansOpt) === Number(q.correct_option)) {
            isCorrect = true;
            pointsEarned = qPts;
          }
          processedAns.selected_option = ansOpt;
        }
      }

      totalPoints += pointsEarned;
      processedAns.is_correct = isCorrect;
      processedAns.points_earned = pointsEarned;

      processedAnswers.push(processedAns);
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