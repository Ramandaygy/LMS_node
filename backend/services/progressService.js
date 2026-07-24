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
  const presentDays = attendances.filter(a => a.status === 'present').length;
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
  const avgQuizScore = quizCount > 0 ? quizScoreSum / quizCount : 0;

  // 5. Construct timeline of grades over time for line chart
  const allScores = [
    ...submissions.map(s => {
      const assign = assignmentMap[s.assignment_id.toString()] || { title: 'Tugas', total_score: 100 };
      const pctScore = assign.total_score > 0 ? (s.score / assign.total_score) * 100 : 0;
      return {
        date: new Date(s.submitted_at || s.createdAt || new Date()),
        score: pctScore,
        title: assign.title
      };
    }),
    ...grades.map(g => {
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
    .map(s => ({
      date: s.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      score: Math.round(s.score),
      title: s.title
    }));

  return { 
    avgScore, 
    attendanceRate, 
    materialCompletionRate, 
    avgQuizScore,
    detailedAssignments,
    detailedGrades,
    timeline
  };
}

exports.getStudentProgress = async (studentId) => {
  const data = await getStudentData(studentId);
  const prediction = rfService.predictRisk(data.avgScore, data.attendanceRate, data.materialCompletionRate, data.avgQuizScore);
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