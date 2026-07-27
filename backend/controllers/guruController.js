const mongoose = require('mongoose');

exports.getBinaanStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const objTeacherId = new mongoose.Types.ObjectId(teacherId);

    const classCol = mongoose.connection.collection('classes');
    const guruCol = mongoose.connection.collection('users_guru');
    const guru = await guruCol.findOne({ _id: objTeacherId });

    // 1. Find Homeroom Class (for Wali Kelas Rapor view)
    const homeroomClasses = await classCol.find({ homeroom_teacher: objTeacherId }).toArray();
    const homeroomClassName = homeroomClasses.length > 0 ? homeroomClasses[0].name : null;

    // 2. Find All Classes Taught by this Teacher
    const assignedClassIds = (guru?.classes || []).map((id) => id.toString());
    const assignedClassObjIds = assignedClassIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const allClassesDocs = await classCol.find({
      $or: [
        { homeroom_teacher: objTeacherId },
        { _id: { $in: assignedClassObjIds } },
        { name: { $in: assignedClassIds } }
      ]
    }).toArray();

    // Fallback: If no classes linked in profile, load all active classes
    const targetClasses = allClassesDocs.length > 0
      ? allClassesDocs
      : await classCol.find({ is_active: { $ne: false } }).toArray();

    const targetClassIds = targetClasses.map((c) => c._id);
    const targetClassIdStrings = targetClasses.map((c) => c._id.toString());
    const targetClassNames = targetClasses.map((c) => c.name);

    const classMap = {};
    targetClasses.forEach((c) => {
      classMap[c._id.toString()] = c.name;
      classMap[c.name] = c.name;
    });

    // 3. Find students in ALL target classes
    const studentCol = mongoose.connection.collection('users_siswa');
    const students = await studentCol.find({
      is_active: { $ne: false },
      $or: [
        { class_id: { $in: targetClassIds } },
        { class_id: { $in: targetClassIdStrings } },
        { class_id: { $in: targetClassNames } },
        { class_name: { $in: targetClassNames } }
      ]
    }).sort({ full_name: 1 }).toArray();

    if (!students || students.length === 0) {
      return res.status(200).json({
        success: true,
        students: [],
        subjects: [],
        homeroom_class: homeroomClassName,
        teacher_classes: targetClasses.map((c) => ({ id: c._id.toString(), name: c.name }))
      });
    }

    // 4. Fetch teacher profile for assigned subjects
    const Subject = require('../models/Subject');
    const subjects = await Subject.find({ is_active: true }).lean();

    const assignedSubjectIds = (guru?.subjects || []).map((id) => id.toString());
    const teacherSubjects = assignedSubjectIds.length > 0
      ? subjects.filter((s) => assignedSubjectIds.includes(s._id.toString()))
      : subjects;

    // 4. Fetch grades for these students
    const Grade = require('../models/Grade');
    const studentIds = students.map(s => s._id);
    const studentIdStrings = students.map(s => s._id.toString());
    
    const grades = await Grade.find({
      student: { $in: [...studentIds, ...studentIdStrings] }
    }).lean();

    // 5. Fetch all rated submissions to compute average assignment scores per subject
    const submissions = await mongoose.connection.collection('submissions').find({
      student_id: { $in: [...studentIds, ...studentIdStrings] },
      score: { $ne: null }
    }).toArray();

    const assignmentIds = submissions.map(s => s.assignment_id);
    const assignments = await mongoose.connection.collection('assignments').find({
      _id: { $in: assignmentIds }
    }).toArray();

    const assignmentMap = Object.fromEntries(assignments.map(a => [a._id.toString(), {
      subject: a.subject?.toString(),
      max_score: a.max_score || 100
    } ]));

    // Calculate assignment average per student per subject
    const assignmentGradesByStudent = {};
    students.forEach(s => {
      assignmentGradesByStudent[s._id.toString()] = {};
    });

    submissions.forEach(sub => {
      const sId = sub.student_id ? sub.student_id.toString() : '';
      const assignInfo = assignmentMap[sub.assignment_id.toString()];
      if (assignInfo && assignInfo.subject && assignmentGradesByStudent[sId]) {
        const subId = assignInfo.subject;
        if (!assignmentGradesByStudent[sId][subId]) {
          assignmentGradesByStudent[sId][subId] = { sum: 0, max: 0 };
        }
        assignmentGradesByStudent[sId][subId].sum += sub.score;
        assignmentGradesByStudent[sId][subId].max += assignInfo.max_score;
      }
    });

    // 6. Fetch attendance for these students
    const Attendance = require('../models/Attendance');
    const attendances = await Attendance.find({
      student_id: { $in: [...studentIds, ...studentIdStrings] }
    }).lean();

    // Group attendance by student
    const attendanceByStudent = {};
    students.forEach(s => {
      attendanceByStudent[s._id.toString()] = { sick: 0, permit: 0, absent: 0, total: 0 };
    });
    attendances.forEach(att => {
      const sId = att.student_id ? att.student_id.toString() : '';
      if (attendanceByStudent[sId]) {
        if (att.status === 'sick') {
          attendanceByStudent[sId].sick++;
          attendanceByStudent[sId].total++;
        } else if (att.status === 'permit' || att.status === 'late') {
          attendanceByStudent[sId].permit++;
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

    // Normalize and map to average assignment grade per student per subject
    const studentSubjectAssignmentAvg = {};
    students.forEach(s => {
      const sId = s._id.toString();
      studentSubjectAssignmentAvg[sId] = {};
      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const records = assignmentGradesByStudent[sId]?.[subId];
        if (records && records.max > 0) {
          studentSubjectAssignmentAvg[sId][subId] = Number(((records.sum / records.max) * 100).toFixed(2));
        } else {
          studentSubjectAssignmentAvg[sId][subId] = '-';
        }
      });
    });

    // Calculate NA (Formula 2:1:1), Rapor Avg, and Rapor Rank for each student
    const studentsData = students.map(s => {
      const sId = s._id.toString();
      const studentGrades = gradesByStudent[sId] || {};
      const taskGrades = studentSubjectAssignmentAvg[sId] || {};
      
      const subjectNA = {};
      let naSum = 0;
      let naCount = 0;

      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const nhScore = typeof taskGrades[subId] === 'number' ? taskGrades[subId] : null;
        const ptsScore = typeof studentGrades[subId]?.uts === 'number' ? studentGrades[subId].uts : null;
        const pasScore = typeof studentGrades[subId]?.uas === 'number' ? studentGrades[subId].uas : null;

        if (nhScore !== null || ptsScore !== null || pasScore !== null) {
          const nhVal = nhScore !== null ? nhScore : (ptsScore !== null ? ptsScore : (pasScore !== null ? pasScore : 0));
          const ptsVal = ptsScore !== null ? ptsScore : nhVal;
          const pasVal = pasScore !== null ? pasScore : nhVal;
          const na = Math.round((nhVal + ptsVal + pasVal) / 3);

          subjectNA[subId] = na;
          naSum += na;
          naCount++;
        } else {
          subjectNA[subId] = '-';
        }
      });

      const raporAvg = naCount > 0 ? Number((naSum / naCount).toFixed(2)) : 0;

      // Calculate UTS sum and avg
      let utsSum = 0;
      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const score = studentGrades[subId]?.uts;
        if (typeof score === 'number') utsSum += score;
      });
      const utsAvg = subjects.length > 0 ? (utsSum / subjects.length) : 0;
      
      // Calculate UAS sum and avg
      let uasSum = 0;
      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const score = studentGrades[subId]?.uas;
        if (typeof score === 'number') uasSum += score;
      });
      const uasAvg = subjects.length > 0 ? (uasSum / subjects.length) : 0;

      // Calculate Task sum and avg (Nilai Tugas Mapel)
      let taskSum = 0;
      subjects.forEach(sub => {
        const subId = sub._id.toString();
        const score = taskGrades[subId];
        if (typeof score === 'number') taskSum += score;
      });
      const taskAvg = subjects.length > 0 ? (taskSum / subjects.length) : 0;

      return {
        _id: s._id,
        full_name: s.full_name,
        nis: s.nis,
        class_name: classMap[s.class_id?.toString()] || '-',
        attendance: attendanceByStudent[sId] || { sick: 0, late: 0, absent: 0, total: 0 },
        grades: studentGrades, // for ATS/AAS detail
        tasks: taskGrades, // for task details
        na_grades: subjectNA, // NA per subject (2:1:1)
        rapor_sum: naSum,
        rapor_avg: raporAvg,
        uts_sum: utsSum,
        uts_avg: Number(utsAvg.toFixed(2)),
        uas_sum: uasSum,
        uas_avg: Number(uasAvg.toFixed(2)),
        task_sum: Number(taskSum.toFixed(2)),
        task_avg: Number(taskAvg.toFixed(2)),
        rank_rapor: 0,
        rank_task: 0
      };
    });

    // Group students by class_name for per-class ranking
    const studentsByClass = {};
    studentsData.forEach((s) => {
      const cName = s.class_name || 'Unassigned';
      if (!studentsByClass[cName]) studentsByClass[cName] = [];
      studentsByClass[cName].push(s);
    });

    // Calculate per-class rankings for Rapor (NA) and Tasks (NH)
    Object.keys(studentsByClass).forEach((cName) => {
      const classStudents = studentsByClass[cName];

      // Per-Class Rapor Rank
      classStudents.sort((a, b) => b.rapor_avg - a.rapor_avg);
      classStudents.forEach((student, index) => {
        if (index > 0 && student.rapor_avg === classStudents[index - 1].rapor_avg) {
          student.rank_rapor = classStudents[index - 1].rank_rapor;
        } else {
          student.rank_rapor = index + 1;
        }
      });

      // Per-Class Task Rank
      classStudents.sort((a, b) => b.task_sum - a.task_sum);
      classStudents.forEach((student, index) => {
        if (index > 0 && student.task_sum === classStudents[index - 1].task_sum) {
          student.rank_task = classStudents[index - 1].rank_task;
        } else {
          student.rank_task = index + 1;
        }
      });
    });
    return res.status(200).json({
      success: true,
      students: studentsData,
      subjects,
      homeroom_class: homeroomClassName,
      teacher_subjects: teacherSubjects,
      teacher_classes: targetClasses.map((c) => ({ id: c._id.toString(), name: c.name }))
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

    // Kirim push notification nilai baru ke siswa & orang tua
    try {
      const notificationController = require('./notificationController');
      const siswaCol = mongoose.connection.collection('users_siswa');
      const subjectCol = mongoose.connection.collection('subjects');
      
      const student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(student_id) });
      const subject = await subjectCol.findOne({ _id: new mongoose.Types.ObjectId(subject_id) });
      
      if (student && subject) {
        const subjectName = subject.name;
        const examType = type.toUpperCase(); // e.g. UTS, UAS, QUIZ
        
        // 1. Kirim ke Siswa
        notificationController.sendPushNotification(
          student._id.toString(),
          'Nilai Baru!',
          `Nilai ${examType} untuk mata pelajaran ${subjectName} telah dirilis: ${score}. Catatan: ${note || '-'}`,
          '/dashboard/siswa/progress'
        ).catch(e => console.error(e));

        // 2. Kirim ke Orang Tua
        if (student.parent_id) {
          notificationController.sendPushNotification(
            student.parent_id.toString(),
            'Nilai Baru Anak Anda',
            `Nilai ${examType} baru untuk ${student.full_name} (Mapel: ${subjectName}) telah diinput: ${score}.`,
            '/dashboard/ortu'
          ).catch(e => console.error(e));
        }
      }
    } catch (notifErr) {
      console.error('Failed to send grade push notification:', notifErr);
    }

    // EWS check
    try {
      const progressService = require('../services/progressService');
      progressService.checkAndNotifyEWS(student_id.toString()).catch(e => console.error('[EWS Trigger Err]:', e));
    } catch (ewsErr) {
      console.error('Failed to trigger EWS check:', ewsErr);
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

exports.getClassGrades = async (req, res) => {
  try {
    const { classId, subjectId, type } = req.query;
    if (!classId || !subjectId || !type) {
      return res.status(400).json({ success: false, message: 'Parameter tidak lengkap (classId, subjectId, type)' });
    }
    
    const teacherId = req.user.id;
    const role = req.user.role;

    // Fetch class document to get class name if classId is ObjectId
    const classCol = mongoose.connection.collection('classes');
    let classDoc = null;
    let objClassId = null;

    if (mongoose.Types.ObjectId.isValid(classId)) {
      objClassId = new mongoose.Types.ObjectId(classId);
      classDoc = await classCol.findOne({ _id: objClassId });
    } else {
      classDoc = await classCol.findOne({ name: classId });
    }

    const classConditions = [];
    if (objClassId) classConditions.push({ class_id: objClassId });
    classConditions.push({ class_id: classId.toString() });
    if (classDoc && classDoc.name) {
      classConditions.push({ class_id: classDoc.name });
      classConditions.push({ class_name: classDoc.name });
    }

    // Fetch students of class
    const studentCol = mongoose.connection.collection('users_siswa');
    const students = await studentCol.find({
      is_active: { $ne: false },
      $or: classConditions
    }).sort({ full_name: 1 }).toArray();

    if (!students || students.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const studentIds = students.map(s => s._id);
    const studentIdStrings = students.map(s => s._id.toString());

    // Fetch existing grades of this type for this subject and these students
    const Grade = require('../models/Grade');
    const grades = await Grade.find({
      student: { $in: [...studentIds, ...studentIdStrings] },
      subject: subjectId,
      type: type
    }).lean();

    const gradesMap = Object.fromEntries(grades.map(g => [g.student.toString(), { score: g.score, note: g.note || '' }]));

    const studentsData = students.map(s => ({
      _id: s._id,
      full_name: s.full_name,
      nis: s.nis,
      grade: gradesMap[s._id.toString()] || { score: '', note: '' }
    }));

    return res.status(200).json({ success: true, data: studentsData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil nilai kelas' });
  }
};

exports.saveClassGrades = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const role = req.user.role;
    const { classId, subjectId, type, grades } = req.body; // grades is array: [{ student_id, score, note }]
    if (!classId || !subjectId || !type || !Array.isArray(grades)) {
      return res.status(400).json({ success: false, message: 'Payload tidak valid' });
    }

    const Grade = require('../models/Grade');

    for (const item of grades) {
      const { student_id, score, note } = item;
      
      // If score is empty/null, we skip it
      if (score === undefined || score === null || score === '') continue;

      let grade = await Grade.findOne({
        student: student_id,
        subject: subjectId,
        type: type
      });

      if (grade) {
        grade.score = Number(score);
        grade.note = note || '';
        grade.teacher = teacherId;
        await grade.save();
      } else {
        grade = new Grade({
          student: student_id,
          subject: subjectId,
          type: type,
          score: Number(score),
          note: note || '',
          teacher: teacherId
        });
        await grade.save();
      }
    }

    // Kirim push notification nilai baru ke siswa & orang tua secara paralel/background
    try {
      const notificationController = require('./notificationController');
      const siswaCol = mongoose.connection.collection('users_siswa');
      const subjectCol = mongoose.connection.collection('subjects');
      
      const subject = await subjectCol.findOne({ _id: new mongoose.Types.ObjectId(subjectId) });
      const subjectName = subject?.name || 'Mata Pelajaran';
      const examType = type.toUpperCase();

      for (const item of grades) {
        const { student_id, score, note } = item;
        if (score === undefined || score === null || score === '') continue;

        const student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(student_id) });
        if (!student) continue;

        // 1. Kirim ke Siswa
        notificationController.sendPushNotification(
          student._id.toString(),
          'Nilai Baru!',
          `Nilai ${examType} untuk mata pelajaran ${subjectName} telah dirilis: ${score}. Catatan: ${note || '-'}`,
          '/dashboard/siswa/progress'
        ).catch(e => console.error(e));

        // 2. Kirim ke Orang Tua
        if (student.parent_id) {
          notificationController.sendPushNotification(
            student.parent_id.toString(),
            'Nilai Baru Anak Anda',
            `Nilai ${examType} baru untuk ${student.full_name} (Mapel: ${subjectName}) telah diinput: ${score}.`,
            '/dashboard/ortu'
          ).catch(e => console.error(e));
        }
      }
    } catch (notifErr) {
      console.error('Failed to send class grades push notifications:', notifErr);
    }

    // EWS check
    try {
      const progressService = require('../services/progressService');
      for (const item of grades) {
        if (item.student_id && item.score !== undefined && item.score !== null && item.score !== '') {
          progressService.checkAndNotifyEWS(item.student_id.toString()).catch(e => console.error('[EWS Trigger Err]:', e));
        }
      }
    } catch (ewsErr) {
      console.error('Failed to trigger EWS checks for class grades:', ewsErr);
    }

    return res.status(200).json({ success: true, message: 'Nilai berhasil disimpan' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan nilai kelas' });
  }
};

// ======================================
// GET HOMEROOM STATUS (HIDE & SEE PATTERN)
// ======================================
exports.getHomeroomStatus = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const ClassModel = require('../models/Class');

    const homeroomClass = await ClassModel.findOne({
      homeroom_teacher: new mongoose.Types.ObjectId(teacherId),
      is_active: true,
    });

    if (homeroomClass) {
      return res.status(200).json({
        success: true,
        is_homeroom: true,
        homeroom_class: {
          _id: homeroomClass._id,
          name: homeroomClass.name,
          grade_level: homeroomClass.grade_level,
        },
      });
    }

    return res.status(200).json({
      success: true,
      is_homeroom: false,
      homeroom_class: null,
    });
  } catch (err) {
    console.error('Error in getHomeroomStatus:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengecek status wali kelas',
    });
  }
};

exports.getWaliKelasOverview = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const objTeacherId = new mongoose.Types.ObjectId(teacherId);

    const classCol = mongoose.connection.collection('classes');
    const homeroomClass = await classCol.findOne({ homeroom_teacher: objTeacherId, is_active: { $ne: false } });

    if (!homeroomClass) {
      return res.status(200).json({
        success: true,
        is_walikelas: false,
        message: 'Anda tidak terdaftar sebagai Wali Kelas pada kelas aktif manapun.'
      });
    }

    const studentCol = mongoose.connection.collection('users_siswa');
    const classIdStr = homeroomClass._id.toString();
    const students = await studentCol.find({
      is_active: { $ne: false },
      $or: [
        { class_id: homeroomClass._id },
        { class_id: classIdStr },
        { class_id: homeroomClass.name }
      ]
    }).sort({ full_name: 1 }).toArray();

    const progressService = require('../services/progressService');
    const progressData = await progressService.getStudentsProgressByClass(homeroomClass._id);

    const totalStudents = students.length;
    const highRiskCount = progressData.filter(p => p.risk === 'high').length;
    const mediumRiskCount = progressData.filter(p => p.risk === 'medium').length;
    const lowRiskCount = progressData.filter(p => p.risk === 'low').length;

    const avgAttendance = progressData.length > 0
      ? (progressData.reduce((sum, p) => sum + (p.attendanceRate || 0), 0) / progressData.length).toFixed(1)
      : 0;

    const avgGrade = progressData.length > 0
      ? (progressData.reduce((sum, p) => sum + (p.avgScore || 0), 0) / progressData.length).toFixed(1)
      : 0;

    return res.status(200).json({
      success: true,
      is_walikelas: true,
      class_info: {
        id: homeroomClass._id,
        name: homeroomClass.name,
        grade_level: homeroomClass.grade_level,
        major: homeroomClass.major || '-'
      },
      stats: {
        total_students: totalStudents,
        avg_attendance: Number(avgAttendance),
        avg_grade: Number(avgGrade),
        high_risk: highRiskCount,
        medium_risk: mediumRiskCount,
        low_risk: lowRiskCount
      },
      students_progress: progressData
    });
  } catch (err) {
    console.error('WALI KELAS OVERVIEW ERROR:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat data Wali Kelas' });
  }
};

