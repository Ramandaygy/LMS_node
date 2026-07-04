const mongoose = require('mongoose');

exports.getBinaanStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Find classes where homeroom_teacher is this teacher
    const classCol = mongoose.connection.collection('classes');
    const classes = await classCol.find({ homeroom_teacher: new mongoose.Types.ObjectId(teacherId) }).toArray();
    
    if (!classes || classes.length === 0) {
      return res.status(200).json({ success: true, students: [], subjects: [] });
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

    if (!students || students.length === 0) {
      return res.status(200).json({ success: true, students: [], subjects: [] });
    }

    // 3. Fetch all active subjects
    const Subject = require('../models/Subject');
    const subjects = await Subject.find({ is_active: true }).lean();

    // 4. Fetch grades for these students
    const Grade = require('../models/Grade');
    const studentIds = students.map(s => s._id);
    const studentIdStrings = students.map(s => s._id.toString());
    
    const grades = await Grade.find({
      $or: [
        { student: { $in: studentIds } },
        { student: { $in: studentIdStrings } }
      ]
    }).lean();

    // 5. Fetch attendance for these students
    const Attendance = require('../models/Attendance');
    const attendances = await Attendance.find({
      student_id: { $in: [...studentIds, ...studentIdStrings] }
    }).lean();

    // Group attendance by student
    const attendanceByStudent = {};
    students.forEach(s => {
      attendanceByStudent[s._id.toString()] = { sick: 0, late: 0, absent: 0, total: 0 };
    });
    attendances.forEach(att => {
      const sId = att.student_id ? att.student_id.toString() : '';
      if (attendanceByStudent[sId]) {
        if (att.status === 'sick') {
          attendanceByStudent[sId].sick++;
          attendanceByStudent[sId].total++;
        } else if (att.status === 'late') {
          attendanceByStudent[sId].late++;
          attendanceByStudent[sId].total++;
        } else if (att.status === 'absent') {
          attendanceByStudent[sId].absent++;
          attendanceByStudent[sId].total++;
        }
      }
    });

    // Group grades by student and subject
    const gradesByStudent = {};
    students.forEach(s => {
      gradesByStudent[s._id.toString()] = {};
    });
    grades.forEach(g => {
      const sId = g.student ? g.student.toString() : '';
      const subId = g.subject ? g.subject.toString() : '';
      if (gradesByStudent[sId] && subId) {
        if (!gradesByStudent[sId][subId]) {
          gradesByStudent[sId][subId] = { uts: null, uas: null };
        }
        if (g.type === 'uts') {
          gradesByStudent[sId][subId].uts = g.score;
        } else if (g.type === 'uas') {
          gradesByStudent[sId][subId].uas = g.score;
        }
      }
    });

    // 6. Map students and calculate some basic progress/metrics
    const studentsData = students.map(s => {
      const sId = s._id.toString();
      const studentGrades = gradesByStudent[sId] || {};
      
      // Calculate UTS sum and avg
      let utsSum = 0;
      let utsCount = 0;
      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const score = studentGrades[subId]?.uts;
        if (typeof score === 'number') {
          utsSum += score;
          utsCount++;
        }
      });
      const utsAvg = subjects.length > 0 ? (utsSum / subjects.length) : 0;
      
      // Calculate UAS sum and avg
      let uasSum = 0;
      let uasCount = 0;
      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const score = studentGrades[subId]?.uas;
        if (typeof score === 'number') {
          uasSum += score;
          uasCount++;
        }
      });
      const uasAvg = subjects.length > 0 ? (uasSum / subjects.length) : 0;

      return {
        _id: s._id,
        full_name: s.full_name,
        nis: s.nis,
        class_name: classMap[s.class_id?.toString()] || '-',
        attendance: attendanceByStudent[sId] || { sick: 0, late: 0, absent: 0, total: 0 },
        grades: studentGrades,
        uts_sum: utsSum,
        uts_avg: Number(utsAvg.toFixed(2)),
        uas_sum: uasSum,
        uas_avg: Number(uasAvg.toFixed(2)),
        rank_uts: 0,
        rank_uas: 0
      };
    });

    // 7. Calculate ranking for UTS
    const sortedByUts = [...studentsData].sort((a, b) => b.uts_sum - a.uts_sum);
    sortedByUts.forEach((student, index) => {
      if (index > 0 && student.uts_sum === sortedByUts[index - 1].uts_sum) {
        student.rank_uts = sortedByUts[index - 1].rank_uts;
      } else {
        student.rank_uts = index + 1;
      }
    });

    // Calculate ranking for UAS
    const sortedByUas = [...studentsData].sort((a, b) => b.uas_sum - a.uas_sum);
    sortedByUas.forEach((student, index) => {
      if (index > 0 && student.uas_sum === sortedByUas[index - 1].uas_sum) {
        student.rank_uas = sortedByUas[index - 1].rank_uas;
      } else {
        student.rank_uas = index + 1;
      }
    });

    // Map the ranks back to studentsData
    const rankMapUts = Object.fromEntries(studentsData.map(s => [s._id.toString(), s.rank_uts]));
    const rankMapUas = Object.fromEntries(studentsData.map(s => [s._id.toString(), s.rank_uas]));
    
    const finalStudents = studentsData.map(s => {
      const sId = s._id.toString();
      return {
        ...s,
        rank_uts: rankMapUts[sId] || '-',
        rank_uas: rankMapUas[sId] || '-'
      };
    });

    return res.status(200).json({
      success: true,
      students: finalStudents,
      subjects: subjects
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
