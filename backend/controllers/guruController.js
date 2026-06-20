const mongoose = require('mongoose');

exports.getBinaanStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Find classes where homeroom_teacher is this teacher
    const classCol = mongoose.connection.collection('classes');
    const classes = await classCol.find({ homeroom_teacher: new mongoose.Types.ObjectId(teacherId) }).toArray();
    
    if (!classes || classes.length === 0) {
      return res.status(200).json({ success: true, students: [] });
    }

    const classIds = classes.map(c => c._id);
    const classMap = Object.fromEntries(classes.map(c => [c._id.toString(), c.name]));

    // 2. Find students in those classes
    const studentCol = mongoose.connection.collection('users_siswa');
    const students = await studentCol.find({ class_id: { $in: classIds } }).toArray();

    // 3. Map students and calculate some basic progress (optional)
    const studentsData = students.map(s => {
      return {
        _id: s._id,
        full_name: s.full_name,
        nis: s.nis,
        class_name: classMap[s.class_id?.toString()] || '-',
        progress: 0, // Placeholder, can be calculated via progressService if needed
        average_grade: '-', 
      };
    });

    return res.status(200).json({
      success: true,
      students: studentsData
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data siswa binaan'
    });
  }
};

exports.inputGrade = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { student_id, subject_id, type, score, note } = req.body;

    if (!student_id || !subject_id || !type || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Lengkapi semua field (siswa, mata pelajaran, tipe ujian, dan nilai)',
      });
    }

    const Grade = require('../models/Grade');

    // Check if grade already exists for this student, subject, and type
    let grade = await Grade.findOne({
      student: student_id,
      subject: subject_id,
      type: type
    });

    if (grade) {
      grade.score = score;
      grade.note = note || grade.note;
      grade.teacher = teacherId;
      await grade.save();
    } else {
      grade = new Grade({
        student: student_id,
        subject: subject_id,
        type: type,
        score: score,
        note: note || '',
        teacher: teacherId
      });
      await grade.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Nilai berhasil disimpan',
      data: grade
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menyimpan nilai'
    });
  }
};
