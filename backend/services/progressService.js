const mongoose = require('mongoose');

async function getStudentData(studentId) {
  // Ambil submission yang sudah dinilai
  const submissions = await mongoose.connection.collection('submissions').find({ student_id: new mongoose.Types.ObjectId(studentId), score: { $ne: null } }).toArray();
  const assignmentIds = submissions.map(s => s.assignment_id);
  const assignments = await mongoose.connection.collection('assignments').find({ _id: { $in: assignmentIds } }).toArray();
  const assignmentMap = Object.fromEntries(assignments.map(a => [a._id.toString(), a.total_score || 100]));
  let totalScore = 0, totalMax = 0;
  submissions.forEach(sub => {
    totalScore += sub.score;
    totalMax += assignmentMap[sub.assignment_id.toString()] || 100;
  });
  const avgScore = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

  // Ambil absensi
  const attendances = await mongoose.connection.collection('attendances').find({ student_id: new mongoose.Types.ObjectId(studentId) }).toArray();
  const totalDays = attendances.length;
  const presentDays = attendances.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

  return { avgScore, attendanceRate };
}

// Sementara pakai rule-based (nanti bisa ganti dengan Random Forest)
function predictRisk(avgScore, attendanceRate) {
  if (avgScore < 60 || attendanceRate < 70) return { risk: 'high', message: 'Perlu perhatian serius', color: 'red' };
  if (avgScore < 75 || attendanceRate < 85) return { risk: 'medium', message: 'Perlu ditingkatkan', color: 'yellow' };
  return { risk: 'low', message: 'Baik, pertahankan', color: 'green' };
}

exports.getStudentProgress = async (studentId) => {
  const data = await getStudentData(studentId);
  const prediction = predictRisk(data.avgScore, data.attendanceRate);
  return { ...data, ...prediction };
};