const CbtExam = require('../models/CbtExam');
const CbtResult = require('../models/CbtResult');
const Grade = require('../models/Grade');
const User = require('../models/User');

// Get List of Exams (For Siswa & Guru)
exports.getExams = async (req, res) => {
  try {
    const userRole = req.user.role;
    let query = {};

    if (userRole === 'siswa') {
      query.is_active = true;
    } else if (userRole === 'guru') {
      query.teacher = req.user._id;
    }

    const exams = await CbtExam.find(query)
      .populate('subject', 'name code')
      .populate('class_id', 'name')
      .populate('teacher', 'full_name')
      .sort({ createdAt: -1 });

    // If Siswa, attach their previous attempt/result if exists
    if (userRole === 'siswa') {
      const examIds = exams.map(e => e._id);
      const results = await CbtResult.find({
        student: req.user._id,
        exam: { $in: examIds }
      });

      const resultMap = {};
      results.forEach(r => {
        resultMap[r.exam.toString()] = r;
      });

      const examsWithStatus = exams.map(e => {
        const doc = e.toObject();
        const myResult = resultMap[e._id.toString()];
        doc.has_submitted = !!myResult;
        doc.my_score = myResult ? myResult.score : null;
        doc.my_result = myResult || null;
        doc.total_questions = e.questions ? e.questions.length : 0;
        delete doc.questions; // Don't leak questions in list
        return doc;
      });

      return res.json({ success: true, exams: examsWithStatus });
    }

    const examsForGuru = exams.map(e => {
      const doc = e.toObject();
      doc.total_questions = e.questions ? e.questions.length : 0;
      return doc;
    });

    return res.json({ success: true, exams: examsForGuru });
  } catch (err) {
    console.error('Error fetching CBT exams:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat data ujian CBT.' });
  }
};

// Get Exam Detail (For Siswa Taking Test or Guru Viewing)
exports.getExamById = async (req, res) => {
  try {
    const exam = await CbtExam.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('class_id', 'name')
      .populate('teacher', 'full_name');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Ujian CBT tidak ditemukan.' });
    }

    const userRole = req.user.role;

    // Check if student already submitted
    if (userRole === 'siswa') {
      const existingResult = await CbtResult.findOne({
        student: req.user._id,
        exam: exam._id
      });

      const examObj = exam.toObject();

      if (existingResult) {
        // If already submitted, return full questions + answers & explanations for review
        return res.json({
          success: true,
          exam: examObj,
          result: existingResult,
          is_completed: true
        });
      }

      // If student is starting test, strip correct_option & explanation to prevent cheating
      examObj.questions = examObj.questions.map((q, idx) => ({
        _id: q._id,
        index: idx,
        question_text: q.question_text,
        options: q.options
      }));

      return res.json({
        success: true,
        exam: examObj,
        is_completed: false
      });
    }

    return res.json({ success: true, exam });
  } catch (err) {
    console.error('Error fetching exam detail:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat detail ujian CBT.' });
  }
};

// Create CBT Exam (Guru)
exports.createExam = async (req, res) => {
  try {
    const { title, subject, class_id, class_name, duration_minutes, pass_score, is_active, questions } = req.body;

    if (!title || !subject || !questions || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Judul, mata pelajaran, dan minimal 1 soal wajib diisi.' });
    }

    const newExam = new CbtExam({
      title,
      subject,
      class_id: class_id || null,
      class_name: class_name || '',
      teacher: req.user._id,
      duration_minutes: duration_minutes || 30,
      pass_score: pass_score || 75,
      is_active: is_active !== undefined ? is_active : true,
      questions
    });

    await newExam.save();
    return res.status(201).json({ success: true, message: 'Paket Ujian CBT berhasil dibuat.', exam: newExam });
  } catch (err) {
    console.error('Error creating CBT exam:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat Ujian CBT.' });
  }
};

// Update CBT Exam (Guru)
exports.updateExam = async (req, res) => {
  try {
    const { title, subject, class_id, class_name, duration_minutes, pass_score, is_active, questions } = req.body;

    const exam = await CbtExam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Ujian CBT tidak ditemukan.' });
    }

    if (title !== undefined) exam.title = title;
    if (subject !== undefined) exam.subject = subject;
    if (class_id !== undefined) exam.class_id = class_id;
    if (class_name !== undefined) exam.class_name = class_name;
    if (duration_minutes !== undefined) exam.duration_minutes = duration_minutes;
    if (pass_score !== undefined) exam.pass_score = pass_score;
    if (is_active !== undefined) exam.is_active = is_active;
    if (questions !== undefined) exam.questions = questions;

    await exam.save();
    return res.json({ success: true, message: 'Paket Ujian CBT berhasil diperbarui.', exam });
  } catch (err) {
    console.error('Error updating CBT exam:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui Ujian CBT.' });
  }
};

// Delete CBT Exam (Guru)
exports.deleteExam = async (req, res) => {
  try {
    const exam = await CbtExam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Ujian CBT tidak ditemukan.' });
    }

    // Clean up results
    await CbtResult.deleteMany({ exam: req.params.id });

    return res.json({ success: true, message: 'Ujian CBT berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting CBT exam:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus Ujian CBT.' });
  }
};

// Submit CBT Exam Attempt (Siswa)
exports.submitExam = async (req, res) => {
  try {
    const { examId, userAnswers, timeSpentSeconds } = req.body;
    // userAnswers: [{ question_index: 0, selected_option: 1, is_flagged: false }, ...]

    const exam = await CbtExam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Ujian CBT tidak ditemukan.' });
    }

    // Check if already submitted
    const existing = await CbtResult.findOne({ student: req.user._id, exam: exam._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Anda sudah mengumpulkan ujian CBT ini sebelumnya.', result: existing });
    }

    const totalQuestions = exam.questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const evaluatedAnswers = exam.questions.map((q, idx) => {
      const studentAns = (userAnswers || []).find(a => a.question_index === idx);
      const selected = studentAns ? studentAns.selected_option : -1;
      const isFlagged = studentAns ? !!studentAns.is_flagged : false;

      let isCorrect = false;
      if (selected === -1 || selected === undefined || selected === null) {
        unansweredCount++;
      } else if (Number(selected) === Number(q.correct_option)) {
        isCorrect = true;
        correctCount++;
      } else {
        wrongCount++;
      }

      return {
        question_index: idx,
        selected_option: selected,
        is_flagged: isFlagged,
        is_correct: isCorrect
      };
    });

    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isPassed = finalScore >= (exam.pass_score || 75);

    const cbtResult = new CbtResult({
      student: req.user._id,
      exam: exam._id,
      answers: evaluatedAnswers,
      score: finalScore,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      is_passed: isPassed,
      time_spent_seconds: timeSpentSeconds || 0,
      submitted_at: new Date()
    });

    await cbtResult.save();

    // Auto sync to Grade model for subject gradebook
    try {
      await Grade.findOneAndUpdate(
        { student: req.user._id, subject: exam.subject, type: 'quiz' },
        {
          student: req.user._id,
          subject: exam.subject,
          score: finalScore,
          type: 'quiz',
          note: `CBT: ${exam.title}`
        },
        { upsert: true, new: true }
      );
    } catch (gErr) {
      console.error('Failed to sync Grade model:', gErr);
    }

    return res.json({
      success: true,
      message: 'Ujian CBT berhasil dikumpulkan.',
      result: cbtResult
    });
  } catch (err) {
    console.error('Error submitting CBT exam:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengumpulkan Ujian CBT.' });
  }
};

// Get Exam Results For Guru
exports.getExamResultsForGuru = async (req, res) => {
  try {
    const examId = req.params.id;
    const results = await CbtResult.find({ exam: examId })
      .populate('student', 'full_name nis class_name')
      .sort({ score: -1, submitted_at: 1 });

    return res.json({ success: true, results });
  } catch (err) {
    console.error('Error fetching exam results:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat rekap hasil Ujian CBT.' });
  }
};
