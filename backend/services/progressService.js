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

  // 1. Get submissions and assignments
  const submissions = await submissionsCol.find({ student_id: objStudentId, score: { $ne: null } }).toArray();
  const assignmentIds = submissions.map(s => s.assignment_id);
  const assignments = await assignmentsCol.find({ _id: { $in: assignmentIds } }).toArray();
  
  const assignmentMap = {};
  assignments.forEach(a => {
    assignmentMap[a._id.toString()] = {
      title: a.title,
      total_score: a.total_score || 100
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
  const attendances = await attendancesCol.find({ student_id: objStudentId }).toArray();
  const totalDays = attendances.length;
  const presentDays = attendances.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

  // 3. Get material completion
  const student = await siswaCol.findOne({ _id: objStudentId });
  const materialCompletionRate = student?.class_id
    ? await materialProgressService.getStudentMaterialCompletionRate(studentId, student.class_id)
    : 0;

  // 4. Get quiz & exam grades
  const grades = await gradesCol.find({ student: objStudentId }).toArray();
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