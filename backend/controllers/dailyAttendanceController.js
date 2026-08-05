const DailyAttendance = require('../models/DailyAttendance');
const mongoose = require('mongoose');

// Save or Update Daily Attendance in bulk for a class on a specific date
exports.upsertDailyAttendance = async (req, res) => {
  try {
    const { class_id, date, attendance } = req.body;
    const bk_teacher_id = req.user.id;

    if (!class_id || !date || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    // Normalize date to start of day (midnight UTC or local depending on standard)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const bulkOperations = attendance.map(item => {
      return {
        updateOne: {
          filter: {
            student_id: new mongoose.Types.ObjectId(item.student_id),
            date: normalizedDate
          },
          update: {
            $set: {
              class_id: new mongoose.Types.ObjectId(class_id),
              bk_teacher_id: new mongoose.Types.ObjectId(bk_teacher_id),
              status: item.status,
              note: item.note || ''
            }
          },
          upsert: true
        }
      };
    });

    await DailyAttendance.bulkWrite(bulkOperations);

    return res.json({ success: true, message: 'Absensi harian berhasil disimpan' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Daily Attendance for a class on a specific date
exports.getDailyAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({ success: false, message: 'Class ID dan tanggal diperlukan' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setDate(targetDate.getDate() + 1);

    const records = await DailyAttendance.find({
      class_id: new mongoose.Types.ObjectId(classId),
      date: {
        $gte: targetDate,
        $lt: endDate
      }
    });

    return res.json({ success: true, data: records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Student Daily Attendance stats for report cards
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID diperlukan' });
    }

    const records = await DailyAttendance.find({
      student_id: new mongoose.Types.ObjectId(studentId)
    });

    const summary = {
      present: 0,
      absent: 0, // Alfa
      permit: 0, // Izin
      sick: 0    // Sakit
    };

    records.forEach(r => {
      if (r.status === 'present') summary.present++;
      else if (r.status === 'absent') summary.absent++;
      else if (r.status === 'permit') summary.permit++;
      else if (r.status === 'sick') summary.sick++;
    });

    return res.json({ success: true, summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
