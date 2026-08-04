const mongoose = require('mongoose');
const Attendance = require('../models/Attendance'); // ← IMPORT MODEL
const attendanceService = require('../services/attendanceService');

const Schedule = require('../models/Schedule');

// ==================== GURU ====================
exports.getTeacherSchedules = async (req, res) => {
  try {
    const teacherId = req.user.id || req.user._id;
    const schedules = await Schedule.find({ teacher_id: teacherId, is_active: true })
      .populate('class_id', 'name')
      .populate('subject_id', 'name');

    if (!schedules || schedules.length === 0) {
      return res.json({ schedules: [] });
    }

    const scheduleIds = schedules.map(s => s._id);

    // Calculate unique attendance dates recorded for each schedule
    const attendanceStats = await Attendance.aggregate([
      { $match: { schedule_id: { $in: scheduleIds } } },
      { $group: { _id: { schedule_id: '$schedule_id', date: '$date' } } },
      { $group: { _id: '$_id.schedule_id', filled_count: { $sum: 1 } } }
    ]);

    const attendanceMap = {};
    attendanceStats.forEach(stat => {
      attendanceMap[stat._id.toString()] = stat.filled_count;
    });

    const formatted = schedules.map(s => {
      const presensiCount = attendanceMap[s._id.toString()] || 0;
      // Default initial meeting is presensiCount + 1, capped at 16
      const meetingNum = presensiCount > 0 ? Math.min(presensiCount, 16) : 1;

      return {
        id: s._id,
        class_id: s.class_id ? s.class_id._id : null,
        class_name: s.class_id ? s.class_id.name : 'Unknown Class',
        subject_id: s.subject_id ? s.subject_id._id : null,
        subject: s.subject_id ? s.subject_id.name : 'Unknown Subject',
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
        room: s.room || (`Ruang Kelas ${s.class_id ? s.class_id.name : ''}`),
        pertemuan_ke: meetingNum,
        presensi_count: presensiCount,
        total_pertemuan: 16
      };
    });

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

exports.getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    if (!classId) return res.status(400).json({ error: 'classId diperlukan' });

    const mongoose = require('mongoose');
    let filter = {};
    if (mongoose.Types.ObjectId.isValid(classId)) {
      filter.class_id = new mongoose.Types.ObjectId(classId);
    } else {
      const classCol = mongoose.connection.collection('classes');
      const classDoc = await classCol.findOne({ name: classId });
      if (classDoc) {
        filter.class_id = classDoc._id;
      } else {
        filter.class_id = classId;
      }
    }

    const attendance = await Attendance.find(filter)
      .sort({ session_number: 1, student_id: 1, date: 1 });

    return res.json({ attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { schedule_id, date, session_number } = req.query;
    const teacherId = req.user.id;
    if (!schedule_id) {
      return res.status(400).json({ error: 'schedule_id diperlukan' });
    }
    const attendance = await attendanceService.getAttendanceByScheduleAndSession(
      schedule_id, 
      session_number ? parseInt(session_number) : null,
      date, 
      teacherId
    );
    return res.json({ attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.saveAttendance = async (req, res) => {
  try {
    const { attendance, schedule_id, class_id, date, session_number } = req.body;
    const teacherId = req.user.id;
    if (!attendance || !schedule_id || !class_id || !date) {
      return res.status(400).json({ error: 'Data tidak lengkap (butuh attendance, schedule_id, class_id, date)' });
    }
    const sessionNum = parseInt(session_number) || 1;
    await attendanceService.saveAttendance(attendance, schedule_id, class_id, date, teacherId, sessionNum);

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

exports.getScheduleSessionsSummary = async (req, res) => {
  try {
    const { schedule_id } = req.query;
    if (!schedule_id) return res.status(400).json({ error: 'schedule_id required' });
    const summary = await attendanceService.getScheduleSessionsSummary(schedule_id);
    return res.json({ success: true, summary });
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
    const ortuId = req.user.id || req.user._id;
    let ortuObjId;
    try { ortuObjId = new mongoose.Types.ObjectId(ortuId.toString()); } catch(e) { ortuObjId = ortuId; }

    const ortuCollection = mongoose.connection.collection('users_ortu');
    let ortu = await ortuCollection.findOne({ _id: ortuObjId });
    if (!ortu) {
      const User = require('../models/User');
      ortu = await User.findById(ortuObjId).lean();
    }

    let childrenIds = (ortu && ortu.children) ? ortu.children : [];
    const siswaCollection = mongoose.connection.collection('users_siswa');
    let children = [];

    if (childrenIds.length > 0) {
      const objIds = childrenIds.map(id => {
        try { return new mongoose.Types.ObjectId(id.toString()); } catch(e) { return id; }
      });
      children = await siswaCollection.find({ _id: { $in: objIds } }).toArray();
      if (children.length === 0) {
        const User = require('../models/User');
        children = await User.find({ _id: { $in: objIds } }).lean();
      }
    }

    // Fallback: If no children linked yet, return first available student accounts
    if (children.length === 0) {
      children = await siswaCollection.find().limit(2).toArray();
    }

    const classCollection = mongoose.connection.collection('classes');
    const formatted = [];
    for (const child of children) {
      let className = child.class_name || '';
      if (!className && child.class_id) {
        try {
          const classDoc = await classCollection.findOne({ _id: new mongoose.Types.ObjectId(child.class_id.toString()) });
          if (classDoc) className = classDoc.name;
        } catch (e) {}
      }
      formatted.push({
        id: child._id,
        _id: child._id,
        full_name: child.full_name,
        nis: child.nis || child.nisn || '-',
        class_name: className || 'Kelas 8B',
      });
    }
    return res.json({ success: true, children: formatted });
  } catch (err) {
    console.error('Error in getOrtuChildren:', err);
    return res.status(500).json({ success: false, error: err.message });
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