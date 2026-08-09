const mongoose = require('mongoose');
const materialProgressService = require('./materialProgressService');
const rfService = require('./rfService');

async function getStudentData(studentId) {
  const submissionsCol = mongoose.connection.collection('submissions');
  const assignmentsCol = mongoose.connection.collection('assignments');
  const attendancesCol = mongoose.connection.collection('attendances');
  const gradesCol = mongoose.connection.collection('grades');
  const subjectsCol = mongoose.connection.collection('subjects');
  const siswaCol = mongoose.connection.collection('users_siswa');

  const objStudentId = new mongoose.Types.ObjectId(studentId);
  const strStudentId = studentId.toString();

  // 1. Get submissions and assignments
  const submissions = await submissionsCol.find({
    student_id: { $in: [objStudentId, strStudentId] },
    score: { $ne: null }
  }).toArray();

  const assignmentIds = submissions.map(s => s.assignment_id);
  const assignmentIdStrings = assignmentIds.map(id => id.toString());
  const assignments = await assignmentsCol.find({
    _id: { $in: [...assignmentIds, ...assignmentIdStrings] }
  }).toArray();
  
  const assignmentMap = {};
  assignments.forEach(a => {
    assignmentMap[a._id.toString()] = {
      title: a.title,
      total_score: a.total_score || a.max_score || 100
    };
  });

  let totalScore = 0, totalMax = 0;
  const detailedAssignments = submissions.map(s => {
    const assign = assignmentMap[s.assignment_id.toString()] || { title: 'Tugas', total_score: 100 };
    const pctScore = assign.total_score > 0 ? (s.score / assign.total_score) * 100 : 0;
    totalScore += s.score;
    totalMax += assign.total_score;
    
    return {
      _id: s._id,
      title: assign.title,
      score: s.score,
      max_score: assign.total_score,
      pct: Math.round(pctScore),
      submitted_at: s.submitted_at || s.createdAt || new Date()
    };
  });
  const avgScore = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

  // 2. Get attendance
  const attendances = await attendancesCol.find({
    student_id: { $in: [objStudentId, strStudentId] }
  }).toArray();
  const totalDays = attendances.length;
  const presentDays = attendances.filter(a => {
    const st = (a.status || '').toLowerCase();
    return st === 'hadir' || st === 'present' || st === 'sakit' || st === 'sick' || st === 'ijin' || st === 'izin' || st === 'permission';
  }).length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

  // 3. Get material completion
  const student = await siswaCol.findOne({ _id: objStudentId });
  const materialCompletionRate = student?.class_id
    ? await materialProgressService.getStudentMaterialCompletionRate(studentId, student.class_id)
    : 0;

  // 4. Get quiz & exam grades
  const grades = await gradesCol.find({
    student: { $in: [objStudentId, strStudentId] }
  }).toArray();
  const subjectIds = grades.map(g => g.subject).filter(Boolean);
  const subjects = await subjectsCol.find({ _id: { $in: subjectIds } }).toArray();
  const subjectMap = {};
  subjects.forEach(s => {
    subjectMap[s._id.toString()] = s.name;
  });

  let quizScoreSum = 0, quizCount = 0;
  const detailedGrades = grades.map(g => {
    const subName = subjectMap[g.subject?.toString()] || 'Mata Pelajaran';
    if (g.type === 'quiz') {
      quizScoreSum += g.score;
      quizCount++;
    }
    return {
      _id: g._id,
      subject_name: subName,
      type: g.type, // 'uts' | 'uas' | 'quiz'
      score: g.score,
      note: g.note || '',
      created_at: g.created_at || g.createdAt || new Date()
    };
  });

  // Also include Live Quiz submissions
  const QuizSubmission = require('../models/QuizSubmission');
  const liveQuizSubmissions = await QuizSubmission.find({
    student_id: objStudentId 
  }).lean();

  liveQuizSubmissions.forEach(sub => {
    // If they got 2 stars, total_score is probably > 0, but we use total_score
    quizScoreSum += (sub.total_score || 0);
    quizCount++;
  });

  const avgQuizScore = quizCount > 0 ? quizScoreSum / quizCount : 0;

  // 5. Compute subject breakdown for all subjects
  const allSubjectDocs = await subjectsCol.find({ is_active: { $ne: false } }).toArray();
  const subjectBreakdown = allSubjectDocs.map((sub) => {
    const subIdStr = sub._id.toString();

    const subAssignments = assignments.filter((a) => (a.subject || a.subject_id || a.subjectId)?.toString() === subIdStr);
    const subAssignIds = subAssignments.map((a) => a._id.toString());
    const subSubmissions = submissions.filter((s) => subAssignIds.includes(s.assignment_id.toString()));

    let subTaskScoreSum = 0;
    let subTaskMaxSum = 0;
    subSubmissions.forEach((s) => {
      const assign = assignmentMap[s.assignment_id.toString()] || { total_score: 100 };
      subTaskScoreSum += s.score;
      subTaskMaxSum += assign.total_score || 100;
    });
    const subNH = subTaskMaxSum > 0 ? Math.round((subTaskScoreSum / subTaskMaxSum) * 100) : null;

    const subGrades = grades.filter((g) => g.subject?.toString() === subIdStr);
    const ptsObj = subGrades.find((g) => g.type === 'uts');
    const pasObj = subGrades.find((g) => g.type === 'uas');
    const pts = ptsObj ? ptsObj.score : null;
    const pas = pasObj ? pasObj.score : null;

    let subAvgScore = '-';
    if (subNH !== null || pts !== null || pas !== null) {
      const nhVal = subNH !== null ? subNH : (pts !== null ? pts : (pas !== null ? pas : 0));
      const ptsVal = pts !== null ? pts : nhVal;
      const pasVal = pas !== null ? pas : nhVal;
      subAvgScore = Math.round((nhVal + ptsVal + pasVal) / 3);
    }

    return {
      subject_name: sub.name,
      avg_score: subAvgScore,
      submission_count: subSubmissions.length,
      attendance_count: presentDays
    };
  });

  // 6. Construct timeline of grades over time for line chart
  const allScores = [
    ...submissions.map((s) => {
      const assign = assignmentMap[s.assignment_id.toString()] || { title: 'Tugas', total_score: 100 };
      const pctScore = assign.total_score > 0 ? (s.score / assign.total_score) * 100 : 0;
      return {
        date: new Date(s.submitted_at || s.createdAt || new Date()),
        score: pctScore,
        title: assign.title
      };
    }),
    ...grades.map((g) => {
      const subName = subjectMap[g.subject?.toString()] || 'Ujian';
      return {
        date: new Date(g.createdAt || g.created_at || new Date()),
        score: g.score,
        title: `${g.type.toUpperCase()}: ${subName}`
      };
    })
  ];

  const timeline = allScores
    .sort((a, b) => a.date - b.date)
    .map((s) => ({
      date: s.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      score: Math.round(s.score),
      title: s.title
    }));

  // Summary object for frontend modal
  const numericNaScores = subjectBreakdown.map((s) => s.avg_score).filter((v) => typeof v === 'number');
  const computedOverallAvg = numericNaScores.length > 0
    ? Math.round(numericNaScores.reduce((a, b) => a + b, 0) / numericNaScores.length)
    : (avgScore > 0 ? Math.round(avgScore) : 0);

  const summary = {
    avg_score: computedOverallAvg,
    attendance_rate: Math.round(attendanceRate),
    material_completion_rate: Math.round(materialCompletionRate),
    submitted_assignments: submissions.length,
    total_assignments: assignments.length || submissions.length,
  };

  return { 
    avgScore: computedOverallAvg, 
    attendanceRate, 
    materialCompletionRate, 
    avgQuizScore,
    detailedAssignments,
    detailedGrades,
    subject_breakdown: subjectBreakdown,
    summary,
    timeline
  };
}

exports.getStudentProgress = async (studentId) => {
  const data = await getStudentData(studentId);
  const prediction = rfService.predictRisk(data.avgScore, data.attendanceRate, data.materialCompletionRate, data.avgQuizScore);
  data.summary.risk_assessment = prediction;
  return { ...data, ...prediction };
};

exports.checkAndNotifyEWS = async (studentId) => {
  try {
    const notificationController = require('../controllers/notificationController');
    const siswaCol = mongoose.connection.collection('users_siswa');
    const classCol = mongoose.connection.collection('classes');
    const objStudentId = new mongoose.Types.ObjectId(studentId);

    // 1. Get student
    const student = await siswaCol.findOne({ _id: objStudentId });
    if (!student) return;

    // 2. Compute current progress and risk
    const progress = await exports.getStudentProgress(studentId);
    const currentRisk = progress.risk; // 'high', 'medium', 'low'

    // Get previous risk from db
    const lastRisk = student.last_ews_risk;

    // 3. If risk is high and wasn't high before
    if (currentRisk === 'high' && lastRisk !== 'high') {
      // Send notification to student
      await notificationController.sendPushNotification(
        studentId,
        'Peringatan Dini EWS!',
        `Hasil analisis mendeteksi tingkat risiko belajar Anda berkategori TINGGI. Silakan tingkatkan nilai, kehadiran, atau penyelesaian materi Anda.`,
        '/dashboard/siswa/progress'
      ).catch(e => console.error('[EWS Notif Siswa Err]:', e));

      // Send notification to parent
      if (student.parent_id) {
        await notificationController.sendPushNotification(
          student.parent_id.toString(),
          'Peringatan EWS Anak Anda',
          `Hasil analisis mendeteksi tingkat risiko belajar anak Anda (${student.full_name}) berkategori TINGGI. Silakan pantau perkembangan belajar anak Anda.`,
          '/dashboard/ortu'
        ).catch(e => console.error('[EWS Notif Ortu Err]:', e));
      }

      // Send notification to homeroom teacher (wali kelas)
      if (student.class_id) {
        const classDoc = await classCol.findOne({ _id: new mongoose.Types.ObjectId(student.class_id.toString()) });
        if (classDoc && classDoc.homeroom_teacher) {
          await notificationController.sendPushNotification(
            classDoc.homeroom_teacher.toString(),
            'Peringatan EWS Siswa',
            `Siswa Anda (${student.full_name}) di kelas ${classDoc.name} terdeteksi memiliki tingkat risiko belajar TINGGI. Harap pantau atau berikan bimbingan khusus.`,
            '/dashboard/guru'
          ).catch(e => console.error('[EWS Notif Guru Err]:', e));
        }
      }

      // Update student document in database
      await siswaCol.updateOne(
        { _id: objStudentId },
        { 
          $set: { 
            last_ews_risk: 'high',
            last_ews_notified_at: new Date()
          } 
        }
      );
      console.log(`[EWS] Notified High Risk for student: ${student.full_name}`);
    } else if (currentRisk !== lastRisk) {
      // Sync last_ews_risk in db if it changed but isn't high
      await siswaCol.updateOne(
        { _id: objStudentId },
        { 
          $set: { 
            last_ews_risk: currentRisk 
          } 
        }
      );
    }
  } catch (err) {
    console.error('[EWS] Error checking and notifying EWS:', err);
  }
};

exports.getStudentsProgressByClass = async (classId) => {
  const mongoose = require('mongoose');
  const Material = require('../models/Material');
  const MaterialProgress = require('../models/MaterialProgress');
  const siswaCol = mongoose.connection.collection('users_siswa');
  const submissionsCol = mongoose.connection.collection('submissions');
  const assignmentsCol = mongoose.connection.collection('assignments');
  const attendancesCol = mongoose.connection.collection('attendances');
  const gradesCol = mongoose.connection.collection('grades');
  const subjectsCol = mongoose.connection.collection('subjects');

  const classIdStr = classId.toString();
  let classObjectId;
  try { classObjectId = new mongoose.Types.ObjectId(classIdStr); } catch (e) { classObjectId = classIdStr; }

  // 1. Fetch all students in the class (1 query)
  const students = await siswaCol.find({
    is_active: { $ne: false },
    $or: [
      { class_id: classObjectId },
      { class_id: classIdStr }
    ]
  }).sort({ full_name: 1 }).toArray();

  if (students.length === 0) return [];

  const studentIds = students.map(s => s._id);
  const studentIdStrings = studentIds.map(id => id.toString());

  // 2. Batch fetch ALL submissions for all students (1 query)
  const allSubmissions = await submissionsCol.find({
    student_id: { $in: [...studentIds, ...studentIdStrings] },
    score: { $ne: null }
  }).toArray();

  // 3. Batch fetch ALL related assignments (1 query)
  const assignmentIds = [...new Set(allSubmissions.map(s => s.assignment_id.toString()))];
  const assignmentObjIds = assignmentIds.map(id => {
    try { return new mongoose.Types.ObjectId(id); } catch (e) { return id; }
  });
  const allAssignments = assignmentObjIds.length > 0
    ? await assignmentsCol.find({ _id: { $in: [...assignmentObjIds, ...assignmentIds] } }).toArray()
    : [];

  const assignmentMap = {};
  allAssignments.forEach(a => {
    assignmentMap[a._id.toString()] = {
      title: a.title,
      total_score: a.total_score || a.max_score || 100,
      subject: (a.subject || a.subject_id || a.subjectId || '').toString()
    };
  });

  // 4. Batch fetch ALL attendances for all students (1 query)
  const allAttendances = await attendancesCol.find({
    student_id: { $in: [...studentIds, ...studentIdStrings] }
  }).toArray();

  // 5. Batch fetch ALL grades for all students (1 query)
  const allGrades = await gradesCol.find({
    student: { $in: [...studentIds, ...studentIdStrings] }
  }).toArray();

  // 6. Batch fetch material completion data (2 queries)
  const materialIds = await Material.find({ class_id: classObjectId }).distinct('_id');
  const allMaterialProgress = materialIds.length > 0
    ? await MaterialProgress.find({
        student: { $in: studentIds },
        material: { $in: materialIds },
        completed: true
      }).lean()
    : [];
  const totalMaterials = materialIds.length;

  // 7. Fetch all subjects once (1 query, shared)
  const allSubjects = await subjectsCol.find({ is_active: { $ne: false } }).toArray();

  // --- GROUP DATA BY STUDENT IN-MEMORY ---
  const submissionsByStudent = {};
  allSubmissions.forEach(s => {
    const sid = s.student_id.toString();
    if (!submissionsByStudent[sid]) submissionsByStudent[sid] = [];
    submissionsByStudent[sid].push(s);
  });

  const attendancesByStudent = {};
  allAttendances.forEach(a => {
    const sid = a.student_id.toString();
    if (!attendancesByStudent[sid]) attendancesByStudent[sid] = [];
    attendancesByStudent[sid].push(a);
  });

  const gradesByStudent = {};
  allGrades.forEach(g => {
    const sid = g.student.toString();
    if (!gradesByStudent[sid]) gradesByStudent[sid] = [];
    gradesByStudent[sid].push(g);
  });

  const materialCompletionByStudent = {};
  allMaterialProgress.forEach(mp => {
    const sid = mp.student.toString();
    materialCompletionByStudent[sid] = (materialCompletionByStudent[sid] || 0) + 1;
  });

  // --- COMPUTE PROGRESS PER STUDENT (IN-MEMORY, NO EXTRA QUERIES) ---
  const progressData = students.map(student => {
    const sid = student._id.toString();

    // Submissions & avg score
    const studentSubmissions = submissionsByStudent[sid] || [];
    let totalScore = 0, totalMax = 0;
    studentSubmissions.forEach(s => {
      const assign = assignmentMap[s.assignment_id.toString()] || { total_score: 100 };
      totalScore += s.score;
      totalMax += assign.total_score;
    });

    // Subject breakdown for overall avg
    const studentGrades = gradesByStudent[sid] || [];
    const subjectBreakdown = allSubjects.map(sub => {
      const subIdStr = sub._id.toString();
      const subAssignments = allAssignments.filter(a => (a.subject || a.subject_id || a.subjectId || '').toString() === subIdStr);
      const subAssignIds = new Set(subAssignments.map(a => a._id.toString()));
      const subSubmissions = studentSubmissions.filter(s => subAssignIds.has(s.assignment_id.toString()));

      let subTaskScoreSum = 0, subTaskMaxSum = 0;
      subSubmissions.forEach(s => {
        const assign = assignmentMap[s.assignment_id.toString()] || { total_score: 100 };
        subTaskScoreSum += s.score;
        subTaskMaxSum += assign.total_score || 100;
      });
      const subNH = subTaskMaxSum > 0 ? Math.round((subTaskScoreSum / subTaskMaxSum) * 100) : null;

      const subGrades = studentGrades.filter(g => g.subject?.toString() === subIdStr);
      const pts = subGrades.find(g => g.type === 'uts')?.score ?? null;
      const pas = subGrades.find(g => g.type === 'uas')?.score ?? null;

      let subAvgScore = null;
      if (subNH !== null || pts !== null || pas !== null) {
        const nhVal = subNH !== null ? subNH : (pts !== null ? pts : (pas !== null ? pas : 0));
        const ptsVal = pts !== null ? pts : nhVal;
        const pasVal = pas !== null ? pas : nhVal;
        subAvgScore = Math.round((nhVal + ptsVal + pasVal) / 3);
      }
      return subAvgScore;
    }).filter(v => typeof v === 'number');

    const avgScore = subjectBreakdown.length > 0
      ? Math.round(subjectBreakdown.reduce((a, b) => a + b, 0) / subjectBreakdown.length)
      : (totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0);

    // Attendance
    const studentAttendances = attendancesByStudent[sid] || [];
    const totalDays = studentAttendances.length;
    const presentDays = studentAttendances.filter(a => {
      const st = (a.status || '').toLowerCase();
      return st === 'hadir' || st === 'present' || st === 'sakit' || st === 'sick' || st === 'ijin' || st === 'izin' || st === 'permission';
    }).length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

    // Quiz score
    let quizScoreSum = 0, quizCount = 0;
    studentGrades.forEach(g => {
      if (g.type === 'quiz') { quizScoreSum += g.score; quizCount++; }
    });
    const avgQuizScore = quizCount > 0 ? quizScoreSum / quizCount : 0;

    // Material completion
    const completedMaterials = materialCompletionByStudent[sid] || 0;
    const materialCompletionRate = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;

    // Risk prediction (pure computation, no DB call)
    const prediction = rfService.predictRisk(avgScore, attendanceRate, materialCompletionRate, avgQuizScore);

    return {
      studentId: student._id,
      student_name: student.full_name,
      studentName: student.full_name,
      nis: student.nis || student.username || '-',
      attendanceRate: Math.round(attendanceRate),
      avgScore: Math.round(avgScore),
      materialCompletionRate: materialCompletionRate,
      avgQuizScore: Math.round(avgQuizScore),
      risk: prediction.risk,
      message: prediction.message,
      reasons: prediction.reasons || []
    };
  });

  return progressData;
};