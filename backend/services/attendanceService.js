const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

// Ambil semua siswa dalam satu kelas (dari koleksi users_siswa)
exports.getStudentsByClass = async (classId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const students = await siswaCollection
    .find({
      role: 'siswa',
      is_active: true,
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

// Ambil absensi untuk jadwal, tanggal, dan guru tertentu
exports.getAttendanceByScheduleAndDate = async (scheduleId, date, teacherId) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const records = await Attendance.find({
    schedule_id: scheduleId,
    teacher_id: teacherId,
    date: { $gte: start, $lte: end },
  });

  const result = {};
  records.forEach(rec => {
    result[rec.student_id.toString()] = {
      status: rec.status,
      note: rec.note,
    };
  });
  return result;
};

// Simpan absensi (bulk upsert)
exports.saveAttendance = async (attendanceList, scheduleId, classId, date, teacherId) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  // Hapus semua absensi yang sudah ada untuk jadwal, kelas, guru, tanggal tsb
  await Attendance.deleteMany({
    schedule_id: scheduleId,
    teacher_id: teacherId,
    date: { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) },
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
  }));

  await Attendance.insertMany(newRecords);
};