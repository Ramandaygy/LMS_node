const mongoose = require('mongoose');
const Attendance = require('../models/Attendance'); // ← IMPORT MODEL
const attendanceService = require('../services/attendanceService');

const Schedule = require('../models/Schedule');

// ==================== GURU ====================
exports.getTeacherSchedules = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const schedules = await Schedule.find({ teacher_id: teacherId, is_active: true })
      .populate('class_id', 'name')
      .populate('subject_id', 'name');

    if (!schedules || schedules.length === 0) {
      return res.json({ schedules: [] });
    }

    const formatted = schedules.map(s => ({
      id: s._id,
      class_id: s.class_id ? s.class_id._id : null,
      class_name: s.class_id ? s.class_id.name : 'Unknown Class',
      subject_id: s.subject_id ? s.subject_id._id : null,
      subject: s.subject_id ? s.subject_id.name : 'Unknown Subject',
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room
    }));

    return res.json({ schedules: formatted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const guruCollection = mongoose.connection.collection('users_guru');
    const guru = await guruCollection.findOne(
      { _id: new mongoose.Types.ObjectId(teacherId) },
      { projection: { classes: 1 } }
    );
    if (!guru) return res.status(404).json({ error: 'Guru tidak ditemukan' });

    const classIds = guru.classes || [];
    if (classIds.length === 0) return res.json({ classes: [] });

    const classCollection = mongoose.connection.collection('classes');
    const classes = await classCollection
      .find({ _id: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) } })
      .toArray();

    const formatted = classes.map(c => ({
      id: c._id,
      name: c.name,
      class_name: c.name,
      subject: c.subject_name || 'Mata Pelajaran',
    }));
    return res.json({ classes: formatted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const students = await attendanceService.getStudentsByClass(classId);
    return res.json({ students });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { schedule_id, date } = req.query;
    const teacherId = req.user.id;
    if (!schedule_id || !date) {
      return res.status(400).json({ error: 'schedule_id dan date diperlukan' });
    }
    const attendance = await attendanceService.getAttendanceByScheduleAndDate(schedule_id, date, teacherId);
    return res.json({ attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.saveAttendance = async (req, res) => {
  try {
    const { attendance, schedule_id, class_id, date } = req.body;
    const teacherId = req.user.id;
    if (!attendance || !schedule_id || !class_id || !date) {
      return res.status(400).json({ error: 'Data tidak lengkap (butuh attendance, schedule_id, class_id, date)' });
    }
    await attendanceService.saveAttendance(attendance, schedule_id, class_id, date, teacherId);

    // Kirim push notification absensi ke siswa & orang tua secara background
    try {
      const notificationController = require('./notificationController');
      const siswaCol = mongoose.connection.collection('users_siswa');
      const ScheduleModel = require('../models/Schedule');
      
      // Ambil detail jadwal untuk mendapatkan nama mata pelajaran
      const schedule = await ScheduleModel.findById(schedule_id).populate('subject_id', 'name');
      const subjectName = schedule?.subject_id?.name || 'Mata Pelajaran';
      
      const formattedDate = new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      // Map status ke bahasa Indonesia
      const statusMap = {
        present: 'HADIR',
        absent: 'ALPA (TIDAK HADIR)',
        sick: 'SAKIT',
        permit: 'IZIN'
      };

      for (const item of attendance) {
        const student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(item.student_id) });
        if (!student) continue;

        const indonesianStatus = statusMap[item.status] || item.status.toUpperCase();

        // 1. Kirim ke Siswa
        notificationController.sendPushNotification(
          student._id.toString(),
          'Absensi Kelas',
          `Kehadiran Anda pada mata pelajaran ${subjectName} tanggal ${formattedDate} tercatat sebagai: ${indonesianStatus}.`,
          '/dashboard/siswa'
        ).catch(e => console.error(e));

        // 2. Kirim ke Orang Tua
        if (student.parent_id) {
          notificationController.sendPushNotification(
            student.parent_id.toString(),
            'Absensi Anak Anda',
            `Anak Anda (${student.full_name}) tercatat: ${indonesianStatus} pada mata pelajaran ${subjectName} tanggal ${formattedDate}.`,
            '/dashboard/ortu'
          ).catch(e => console.error(e));
        }

        // 3. EWS check
        const progressService = require('../services/progressService');
        progressService.checkAndNotifyEWS(student._id.toString()).catch(e => console.error('[EWS Trigger Err]:', e));
      }
    } catch (notifErr) {
      console.error('Failed to send attendance push notifications:', notifErr);
    }

    return res.json({ success: true, message: 'Absensi berhasil disimpan' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// ==================== SISWA ====================
exports.getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    let start, end;
    if (month && year) {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const attendance = await Attendance.find({
      student_id: studentId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    return res.json({ attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// ==================== ORANG TUA ====================
exports.getOrtuChildren = async (req, res) => {
  try {
    const ortuId = req.user.id;
    const ortuCollection = mongoose.connection.collection('users_ortu');
    const ortu = await ortuCollection.findOne(
      { _id: new mongoose.Types.ObjectId(ortuId) },
      { projection: { children: 1 } }
    );
    if (!ortu) return res.status(404).json({ error: 'Orang tua tidak ditemukan' });

    const childrenIds = ortu.children || [];
    if (childrenIds.length === 0) return res.json({ children: [] });

    const siswaCollection = mongoose.connection.collection('users_siswa');
    const children = await siswaCollection.find({
      _id: { $in: childrenIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).toArray();

    const classCollection = mongoose.connection.collection('classes');
    const formatted = [];
    for (const child of children) {
      let className = '';
      if (child.class_id) {
        const classDoc = await classCollection.findOne({ _id: child.class_id });
        className = classDoc ? classDoc.name : '';
      }
      formatted.push({
        id: child._id,
        full_name: child.full_name,
        nis: child.nis,
        class_name: className,
      });
    }
    return res.json({ children: formatted });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getOrtuAttendance = async (req, res) => {
  try {
    const { child_id, month, year } = req.query;
    if (!child_id) return res.status(400).json({ error: 'child_id required' });

    let start, end;
    if (month && year) {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const attendance = await Attendance.find({
      student_id: child_id,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    return res.json({ attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getOrtuTodayAttendance = async (req, res) => {
  try {
    const { childId } = req.params;
    if (!childId) return res.status(400).json({ error: 'childId required' });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      student_id: childId,
      date: { $gte: start, $lte: end },
    }).populate('schedule_id').populate('teacher_id', 'full_name');

    return res.json({ success: true, attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};