const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

// Ambil semua siswa dalam satu kelas (dari koleksi users_siswa)
exports.getStudentsByClass = async (classId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const students = await siswaCollection
    .find({
      role: 'siswa',
      class_id: new mongoose.Types.ObjectId(classId)
    })
    .toArray();
  return students.map(s => ({
    id: s._id,
    full_name: s.full_name,
    nis: s.nis,
    class_id: s.class_id,
  }));
};

// Ambil absensi untuk jadwal, sesi/tanggal, dan guru tertentu
exports.getAttendanceByScheduleAndSession = async (scheduleId, sessionNumber, date, teacherId) => {
  let query = { schedule_id: scheduleId };
  if (sessionNumber) {
    query.session_number = parseInt(sessionNumber);
  } else if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }

  const records = await Attendance.find(query);

  const result = {};
  records.forEach(rec => {
    result[rec.student_id.toString()] = {
      status: rec.status,
      note: rec.note || '',
    };
  });
  return result;
};

// Simpan absensi (bulk upsert)
exports.saveAttendance = async (attendanceList, scheduleId, classId, date, teacherId, sessionNumber = 1) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  // Hapus semua absensi yang sudah ada untuk jadwal, kelas, guru, tanggal / sesi tsb
  await Attendance.deleteMany({
    schedule_id: scheduleId,
    teacher_id: teacherId,
    $or: [
      { date: { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) } },
      { session_number: sessionNumber }
    ]
  });

  if (attendanceList.length === 0) return;

  const newRecords = attendanceList.map(item => ({
    student_id: item.student_id,
    schedule_id: scheduleId,
    class_id: classId,
    teacher_id: teacherId,
    date: start,
    status: item.status,
    note: item.note || '',
    session_number: sessionNumber
  }));

  await Attendance.insertMany(newRecords);
};

// Summary per-session untuk satu jadwal
exports.getScheduleSessionsSummary = async (scheduleId) => {
  const records = await Attendance.find({ schedule_id: scheduleId });
  const summaryBySession = {};
  records.forEach(rec => {
    const sess = rec.session_number || 1;
    if (!summaryBySession[sess]) {
      summaryBySession[sess] = {
        total: 0,
        present: 0,
        sick: 0,
        permit: 0,
        absent: 0,
        date: rec.date
      };
    }
    summaryBySession[sess].total += 1;
    if (rec.status === 'present') summaryBySession[sess].present += 1;
    else if (rec.status === 'sick') summaryBySession[sess].sick += 1;
    else if (rec.status === 'permit') summaryBySession[sess].permit += 1;
    else if (rec.status === 'absent') summaryBySession[sess].absent += 1;
  });
  return summaryBySession;
};