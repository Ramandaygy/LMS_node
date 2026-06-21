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
    const classIdStrings = classes.map(c => c._id.toString());
    const students = await studentCol.find({
      $or: [
        { class_id: { $in: classIds } },
        { class_id: { $in: classIdStrings } }
      ]
    }).toArray();

    // Fetch grades for these students
    const Grade = require('../models/Grade');
    const studentIds = students.map(s => s._id);
    const studentIdStrings = students.map(s => s._id.toString());
    
    const grades = await Grade.find({
      $or: [
        { student: { $in: studentIds } },
        { student: { $in: studentIdStrings } }
      ]
    }).lean();

    // Group grades by student
    const gradesByStudent = {};
    grades.forEach(g => {
      const sId = g.student.toString();
      if (!gradesByStudent[sId]) gradesByStudent[sId] = [];
      gradesByStudent[sId].push(g);
    });

    // 3. Map students and calculate some basic progress
    const studentsData = students.map(s => {
      const studentGrades = gradesByStudent[s._id.toString()] || [];
      const utsUasGrades = studentGrades.filter(g => g.type === 'uts' || g.type === 'uas');
      
      let avgGrade = '-';
      if (utsUasGrades.length > 0) {
        const sum = utsUasGrades.reduce((acc, curr) => acc + curr.score, 0);
        avgGrade = (sum / utsUasGrades.length).toFixed(1);
      }

      return {
        _id: s._id,
        full_name: s.full_name,
        nis: s.nis,
        class_name: classMap[s.class_id?.toString()] || '-',
        progress: 0, // Placeholder
        average_grade: avgGrade, 
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

exports.getStudentGrades = async (req, res) => {
  try {
    const studentId = req.params.id;
    const Grade = require('../models/Grade');
    
    const grades = await Grade.find({ student: studentId })
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      grades: grades
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data nilai siswa'
    });
  }
};
