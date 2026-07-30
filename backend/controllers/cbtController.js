const CbtExam = require('../models/CbtExam');
const CbtResult = require('../models/CbtResult');
const Grade = require('../models/Grade');
const User = require('../models/User');

const mongoose = require('mongoose');

// Get List of Exams (For Siswa & Guru)
exports.getExams = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id || req.user.id || req.user;
    let userObjId;
    try {
      userObjId = new mongoose.Types.ObjectId(userId.toString());
    } catch (e) {
      userObjId = userId;
    }

    // Self-healing migration: Any exam with no target class is marked as master exam template
    try {
      await CbtExam.updateMany(
        {
          $or: [
            { class_id: null },
            { class_id: { $exists: false } },
            { class_name: '' },
            { class_name: 'Semua Kelas' }
          ],
          is_master: { $ne: true }
        },
        { $set: { is_master: true } }
      );
    } catch (migErr) {
      console.error('CBT Migration error:', migErr);
    }

    let query = {};

    if (userRole === 'siswa') {
      const siswaCol = mongoose.connection.collection('users_siswa');
      const student = await siswaCol.findOne({ _id: userObjId });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
      }

      const classConditions = [
        { class_name: student.class_name }
      ];
      if (student.class_id) {
        classConditions.push({ class_id: student.class_id });
        classConditions.push({ class_id: student.class_id.toString() });
      }

      query = {
        is_active: true,
        is_master: false,
        $or: classConditions
      };
    } else if (userRole === 'guru') {
      query.$or = [
        { teacher: userObjId },
        { teacher: userId.toString() }
      ];
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
        student: userObjId,
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
    const userId = req.user._id || req.user.id || req.user;
    let userObjId;
    try {
      userObjId = new mongoose.Types.ObjectId(userId.toString());
    } catch (e) {
      userObjId = userId;
    }

    // Check if student already submitted
    if (userRole === 'siswa') {
      const existingResult = await CbtResult.findOne({
        student: userObjId,
        exam: exam._id
      });

      const examObj = exam.toObject();

      if (existingResult) {
        // If already submitted, check if we need to hide keys/explanations
        const examObj = exam.toObject();
        if (exam.hide_correct_answers) {
          examObj.questions = examObj.questions.map(q => ({
            ...q,
            correct_option: null,
            explanation: 'Kunci jawaban & pembahasan disembunyikan oleh guru.'
          }));
        }
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
    console.error('Error fetching CBT exam detail:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat detail ujian CBT.' });
  }
};

// Create CBT Exam (Guru)
exports.createExam = async (req, res) => {
  try {
    const { title, subject, class_id, class_name, duration_minutes, pass_score, is_active, questions, start_time, end_time, hide_correct_answers } = req.body;

    if (!title || !subject || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Judul, mata pelajaran, dan minimal 1 soal wajib diisi.' });
    }

    const teacherId = req.user._id || req.user.id || req.user;
    let teacherObjId;
    try {
      teacherObjId = new mongoose.Types.ObjectId(teacherId.toString());
    } catch (e) {
      teacherObjId = teacherId;
    }

    let subjectObjId;
    try {
      subjectObjId = new mongoose.Types.ObjectId(subject.toString());
    } catch (e) {
      subjectObjId = subject;
    }

    let classObjId = null;
    if (class_id && class_id.toString().trim() !== '' && mongoose.Types.ObjectId.isValid(class_id.toString())) {
      try {
        classObjId = new mongoose.Types.ObjectId(class_id.toString());
      } catch (e) {
        classObjId = null;
      }
    }

    // Clean up questions array to ensure options are array of 4 strings
    const cleanedQuestions = questions.map((q, idx) => {
      let opts = Array.isArray(q.options) ? q.options.map(o => String(o || '').trim()) : ['', '', '', ''];
      while (opts.length < 4) opts.push('');
      return {
        question_text: String(q.question_text || '').trim(),
        options: opts,
        correct_option: Number(q.correct_option) || 0,
        explanation: String(q.explanation || '').trim()
      };
    });

    const newExam = new CbtExam({
      title: title.trim(),
      subject: subjectObjId,
      class_id: classObjId,
      class_name: class_name || '',
      teacher: teacherObjId,
      duration_minutes: Number(duration_minutes) || 30,
      pass_score: Number(pass_score) || 75,
      is_active: is_active !== undefined ? is_active : true,
      is_master: req.body.is_master !== undefined ? req.body.is_master : true,
      start_time: start_time || null,
      end_time: end_time || null,
      hide_correct_answers: hide_correct_answers !== undefined ? hide_correct_answers : true,
      questions: cleanedQuestions
    });

    await newExam.save();
    return res.status(201).json({ success: true, message: 'Paket Ujian CBT berhasil dibuat.', exam: newExam });
  } catch (err) {
    console.error('Error creating CBT exam:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal membuat Ujian CBT.' });
  }
};

// Update CBT Exam (Guru)
exports.updateExam = async (req, res) => {
  try {
    const { title, subject, class_id, class_name, duration_minutes, pass_score, is_active, questions, start_time, end_time, hide_correct_answers } = req.body;

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
    if (start_time !== undefined) exam.start_time = start_time;
    if (end_time !== undefined) exam.end_time = end_time;
    if (hide_correct_answers !== undefined) exam.hide_correct_answers = hide_correct_answers;

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

    if (!examId) {
      return res.status(400).json({ success: false, message: 'ID Ujian CBT tidak valid.' });
    }

    const studentId = req.user._id || req.user.id || req.user;
    let studentObjId;
    try {
      studentObjId = new mongoose.Types.ObjectId(studentId.toString());
    } catch (e) {
      studentObjId = studentId;
    }

    let examObjId;
    try {
      examObjId = new mongoose.Types.ObjectId(examId.toString());
    } catch (e) {
      examObjId = examId;
    }

    const exam = await CbtExam.findById(examObjId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Ujian CBT tidak ditemukan.' });
    }

    // Check if already submitted
    const existing = await CbtResult.findOne({
      $or: [
        { student: studentObjId, exam: exam._id },
        { student: studentId.toString(), exam: exam._id }
      ]
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Anda sudah mengumpulkan ujian CBT ini sebelumnya.', result: existing });
    }

    const totalQuestions = exam.questions ? exam.questions.length : 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const evaluatedAnswers = (exam.questions || []).map((q, idx) => {
      const studentAns = (userAnswers || []).find(a => Number(a.question_index) === idx);
      const selected = studentAns && studentAns.selected_option !== undefined && studentAns.selected_option !== null ? Number(studentAns.selected_option) : -1;
      const isFlagged = studentAns ? !!studentAns.is_flagged : false;

      let isCorrect = false;
      if (selected === -1 || isNaN(selected)) {
        unansweredCount++;
      } else if (selected === Number(q.correct_option)) {
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
      student: studentObjId,
      exam: exam._id,
      answers: evaluatedAnswers,
      score: finalScore,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      is_passed: isPassed,
      time_spent_seconds: Number(timeSpentSeconds) || 0,
      submitted_at: new Date()
    });

    await cbtResult.save();

    // Auto sync to Grade model for subject gradebook
    try {
      if (exam.subject) {
        await Grade.findOneAndUpdate(
          { student: studentObjId, subject: exam.subject, type: 'quiz' },
          {
            student: studentObjId,
            subject: exam.subject,
            score: finalScore,
            type: 'quiz',
            note: `CBT: ${exam.title}`
          },
          { upsert: true, new: true }
        );
      }
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
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengumpulkan Ujian CBT.' });
  }
};

// Get Exam Results For Guru with robust student details lookup
exports.getExamResultsForGuru = async (req, res) => {
  try {
    const examId = req.params.id;
    const results = await CbtResult.find({ exam: examId }).sort({ score: -1, submitted_at: 1 });

    const studentIds = results.map(r => r.student).filter(Boolean);

    // Look up students from users_siswa and users collections
    const siswaCol = mongoose.connection.collection('users_siswa');
    const siswaList = await siswaCol.find({ _id: { $in: studentIds } }).toArray();

    const usersCol = mongoose.connection.collection('users');
    const usersList = await usersCol.find({ _id: { $in: studentIds } }).toArray();

    const studentMap = {};
    siswaList.forEach(s => {
      studentMap[s._id.toString()] = {
        full_name: s.full_name || s.name || s.username || 'Siswa',
        nis: s.nisn || s.nis || '-',
        class_name: s.class_name || '-'
      };
    });

    usersList.forEach(u => {
      const idStr = u._id.toString();
      if (!studentMap[idStr]) {
        studentMap[idStr] = {
          full_name: u.full_name || u.name || u.username || 'Siswa',
          nis: u.nisn || u.nis || '-',
          class_name: u.class_name || '-'
        };
      }
    });

    const resultsWithStudent = results.map(r => {
      const doc = r.toObject();
      const sId = r.student ? r.student.toString() : '';
      doc.student = studentMap[sId] || {
        full_name: 'Siswa (ID: ' + sId.slice(-4) + ')',
        nis: '-',
        class_name: '-'
      };
      return doc;
    });

    return res.json({ success: true, results: resultsWithStudent });
  } catch (err) {
    console.error('Error fetching exam results:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat rekap hasil Ujian CBT.' });
  }
};

const ExcelJS = require('exceljs');

// Download Excel Template for CBT Questions
exports.downloadTemplateExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Soal CBT');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Pertanyaan', key: 'question_text', width: 45 },
      { header: 'Pilihan A', key: 'opt_a', width: 25 },
      { header: 'Pilihan B', key: 'opt_b', width: 25 },
      { header: 'Pilihan C', key: 'opt_c', width: 25 },
      { header: 'Pilihan D', key: 'opt_d', width: 25 },
      { header: 'Kunci Jawaban (A/B/C/D)', key: 'correct_option', width: 22 },
      { header: 'Pembahasan', key: 'explanation', width: 35 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0284C7' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.addRow({
      no: 1,
      question_text: 'Perangkat keras komputer yang berfungsi sebagai otak utama dalam mengolah data adalah...',
      opt_a: 'RAM',
      opt_b: 'CPU (Processor)',
      opt_c: 'Harddisk',
      opt_d: 'Power Supply',
      correct_option: 'B',
      explanation: 'CPU (Central Processing Unit) merupakan komponen utama pemroses data.'
    });

    worksheet.addRow({
      no: 2,
      question_text: 'Manakah protokol yang digunakan untuk komunikasi web yang aman dan terenkripsi?',
      opt_a: 'HTTP',
      opt_b: 'FTP',
      opt_c: 'HTTPS',
      opt_d: 'SMTP',
      correct_option: 'C',
      explanation: 'HTTPS (Hypertext Transfer Protocol Secure) menggunakan enkripsi TLS/SSL.'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Soal_CBT.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating CBT Excel template:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengunduh template Excel.' });
  }
};

// Import Questions from Uploaded Excel
exports.importQuestionsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File Excel wajib diunggah.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({ success: false, message: 'Sheet Excel tidak ditemukan.' });
    }

    const questions = [];
    const errors = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const getVal = (idx) => {
        const val = row.getCell(idx).value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return val.text || val.result || '';
        return String(val).trim();
      };

      const qText = getVal(2);
      const optA = getVal(3);
      const optB = getVal(4);
      const optC = getVal(5);
      const optD = getVal(6);
      const correctStr = getVal(7).toUpperCase();
      const explanation = getVal(8);

      if (!qText && !optA && !optB) return;

      if (!qText) {
        errors.push(`Baris ${rowNumber}: Pertanyaan tidak boleh kosong.`);
        return;
      }
      if (!optA || !optB || !optC || !optD) {
        errors.push(`Baris ${rowNumber}: Pilihan A, B, C, D harus diisi lengkap.`);
        return;
      }

      let correctOption = 0;
      if (correctStr === 'B' || correctStr === '2') correctOption = 1;
      else if (correctStr === 'C' || correctStr === '3') correctOption = 2;
      else if (correctStr === 'D' || correctStr === '4') correctOption = 3;

      questions.push({
        question_text: qText,
        options: [optA, optB, optC, optD],
        correct_option: correctOption,
        explanation: explanation || ''
      });
    });

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada soal valid yang ditemukan dalam file Excel.',
        errors
      });
    }

    return res.json({
      success: true,
      message: `Berhasil mengekstrak ${questions.length} soal dari Excel.`,
      questions,
      errors
    });
  } catch (err) {
    console.error('Error importing questions Excel:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses file Excel.' });
  }
};

// Export Exam & Results to Excel
exports.exportExamExcel = async (req, res) => {
  try {
    const examId = req.params.id;
    const exam = await CbtExam.findById(examId)
      .populate('subject', 'name')
      .populate('class_id', 'name');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Ujian CBT tidak ditemukan.' });
    }

    const results = await CbtResult.find({ exam: examId }).sort({ score: -1 });

    const studentIds = results.map(r => r.student).filter(Boolean);
    const siswaCol = mongoose.connection.collection('users_siswa');
    const siswaList = await siswaCol.find({ _id: { $in: studentIds } }).toArray();

    const usersCol = mongoose.connection.collection('users');
    const usersList = await usersCol.find({ _id: { $in: studentIds } }).toArray();

    const studentMap = {};
    siswaList.forEach(s => {
      studentMap[s._id.toString()] = {
        full_name: s.full_name || s.name || s.username || 'Siswa',
        nis: s.nisn || s.nis || '-',
        class_name: s.class_name || '-'
      };
    });
    usersList.forEach(u => {
      const idStr = u._id.toString();
      if (!studentMap[idStr]) {
        studentMap[idStr] = {
          full_name: u.full_name || u.name || u.username || 'Siswa',
          nis: u.nisn || u.nis || '-',
          class_name: u.class_name || '-'
        };
      }
    });

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Results Rekap
    const sheet1 = workbook.addWorksheet('Rekapitulasi Hasil Siswa');
    sheet1.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Siswa', key: 'student_name', width: 25 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Kelas', key: 'class_name', width: 12 },
      { header: 'Benar', key: 'correct', width: 10 },
      { header: 'Salah', key: 'wrong', width: 10 },
      { header: 'Skor CBT', key: 'score', width: 12 },
      { header: 'Status KKM', key: 'status', width: 15 },
      { header: 'Tanggal Dikumpulkan', key: 'date', width: 22 }
    ];

    const h1 = sheet1.getRow(1);
    h1.font = { bold: true, color: { argb: 'FFFFFF' } };
    h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

    results.forEach((r, idx) => {
      const sId = r.student ? r.student.toString() : '';
      const sData = studentMap[sId] || { full_name: 'Siswa', nis: '-', class_name: '-' };
      sheet1.addRow({
        no: idx + 1,
        student_name: sData.full_name,
        nis: sData.nis,
        class_name: sData.class_name,
        correct: r.correct_count,
        wrong: r.wrong_count,
        score: r.score,
        status: r.is_passed ? 'LULUS' : 'REMIDIAL',
        date: new Date(r.submitted_at).toLocaleString('id-ID')
      });
    });

    // Sheet 2: Question Bank
    const sheet2 = workbook.addWorksheet('Bank Soal Ujian');
    sheet2.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Pertanyaan', key: 'q', width: 45 },
      { header: 'Pilihan A', key: 'a', width: 20 },
      { header: 'Pilihan B', key: 'b', width: 20 },
      { header: 'Pilihan C', key: 'c', width: 20 },
      { header: 'Pilihan D', key: 'd', width: 20 },
      { header: 'Kunci', key: 'key', width: 10 },
      { header: 'Pembahasan', key: 'exp', width: 30 }
    ];

    const h2 = sheet2.getRow(1);
    h2.font = { bold: true, color: { argb: 'FFFFFF' } };
    h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0284C7' } };

    exam.questions.forEach((q, idx) => {
      sheet2.addRow({
        no: idx + 1,
        q: q.question_text,
        a: q.options[0] || '',
        b: q.options[1] || '',
        c: q.options[2] || '',
        d: q.options[3] || '',
        key: String.fromCharCode(65 + q.correct_option),
        exp: q.explanation || ''
      });
    });

    const safeTitle = exam.title.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Hasil_CBT_${safeTitle}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting CBT Excel:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengeksport data Excel.' });
  }
};

// Distribute/Publish CBT Exam from Bank Master to Class & Session
exports.distributeExam = async (req, res) => {
  try {
    const { master_exam_id, class_id, session_number, duration_minutes, pass_score, start_time, end_time, hide_correct_answers } = req.body;
    const teacherId = req.user.id || req.user._id;

    let masterExam = null;
    if (master_exam_id) {
      masterExam = await CbtExam.findById(master_exam_id);
    }

    if (!masterExam) {
      return res.status(404).json({ success: false, message: 'Template Ujian Master CBT tidak ditemukan.' });
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

    const newPublishedExam = new CbtExam({
      title: masterExam.title,
      description: masterExam.description || '',
      subject: masterExam.subject,
      subject_name: masterExam.subject_name || '',
      class_id: classObj ? classObj._id : class_id,
      class_name: classNameStr,
      teacher: teacherId,
      duration_minutes: duration_minutes || masterExam.duration_minutes || 30,
      pass_score: pass_score || masterExam.pass_score || 75,
      is_master: false,
      is_active: true,
      session_number: parseInt(session_number) || 1,
      start_time: start_time !== undefined ? start_time : masterExam.start_time,
      end_time: end_time !== undefined ? end_time : masterExam.end_time,
      hide_correct_answers: hide_correct_answers !== undefined ? hide_correct_answers : (masterExam.hide_correct_answers !== undefined ? masterExam.hide_correct_answers : true),
      questions: masterExam.questions || []
    });

    await newPublishedExam.save();

    return res.json({
      success: true,
      message: `Berhasil menerbitkan Ujian CBT ke Kelas ${classNameStr} Sesi ke-${session_number || 1}!`,
      exam: newPublishedExam
    });
  } catch (err) {
    console.error('Error distributing CBT exam:', err);
    return res.status(500).json({ success: false, message: 'Gagal menerbitkan Ujian CBT ke kelas.' });
  }
};
