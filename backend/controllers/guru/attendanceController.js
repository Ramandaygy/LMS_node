const Attendance = require('../../models/Attendance');
const Class = require('../../models/Class');
const UserGuru = require('../../models/UserGuru');

// GET /attendance?class_id=...&date=...
exports.getAttendance = async (req, res) => {
  try {
    const { class_id, date } = req.query;
    if (!class_id || !date) {
      return res.status(400).json({ error: 'class_id and date are required' });
    }
    const teacherId = req.user.id;

    // Validasi kelas ada
    const classDoc = await Class.findById(class_id);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Validasi guru mengajar di kelas tersebut
    const teacher = await UserGuru.findById(teacherId).select('classes').lean();
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    if (!teacher.classes.map(id => id.toString()).includes(class_id)) {
      return res.status(403).json({ error: 'You are not authorized to view attendance for this class' });
    }

    const attendanceRecords = await Attendance.find({ class_id, date }).lean();
    const attendanceData = attendanceRecords.map(att => ({
      student_id: att.student_id.toString(),
      status: att.status,
      note: att.note
    }));
    res.json({ attendance: attendanceData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /attendance/save
exports.saveAttendance = async (req, res) => {
  try {
    const { attendance: attendanceList, class_id, date } = req.body;
    if (!class_id || !date) {
      return res.status(400).json({ error: 'class_id and date are required' });
    }
    const teacherId = req.user.id;

    // Validasi kelas
    const classDoc = await Class.findById(class_id);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Validasi guru mengajar di kelas tersebut
    const teacher = await UserGuru.findById(teacherId).select('classes').lean();
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    if (!teacher.classes.map(id => id.toString()).includes(class_id)) {
      return res.status(403).json({ error: 'You are not authorized to save attendance for this class' });
    }

    // Hapus absensi yang sudah ada di tanggal tersebut untuk kelas ini
    await Attendance.deleteMany({ class_id, date });

    // Masukkan data baru
    const docs = (attendanceList || [])
      .filter(att => att.student_id)
      .map(att => ({
        class_id,
        student_id: att.student_id,
        date,
        status: att.status || 'present',
        note: att.note || '',
        created_at: new Date(),
        updated_at: new Date()
      }));

    if (docs.length) {
      await Attendance.insertMany(docs);
    }

    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /attendance/history?class_id=...&limit=30
exports.getAttendanceHistory = async (req, res) => {
  try {
    const { class_id, limit = 30 } = req.query;
    if (!class_id) {
      return res.status(400).json({ error: 'class_id is required' });
    }
    const teacherId = req.user.id;

    const classDoc = await Class.findById(class_id);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const teacher = await UserGuru.findById(teacherId).select('classes').lean();
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    if (!teacher.classes.map(id => id.toString()).includes(class_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pipeline = [
      { $match: { class_id: require('mongoose').Types.ObjectId(class_id) } },
      {
        $group: {
          _id: '$date',
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: parseInt(limit) }
    ];

    const history = await Attendance.aggregate(pipeline);
    const result = history.map(h => ({
      date: h._id,
      present: h.present,
      absent: h.absent,
      late: h.late,
      total: h.total,
      attendance_rate: h.total > 0 ? parseFloat(((h.present / h.total) * 100).toFixed(1)) : 0
    }));

    res.json({ history: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /attendance/student/:student_id?class_id=...
exports.getStudentAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { class_id } = req.query;
    if (!class_id) {
      return res.status(400).json({ error: 'class_id is required' });
    }
    const teacherId = req.user.id;

    const classDoc = await Class.findById(class_id);
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const teacher = await UserGuru.findById(teacherId).select('classes').lean();
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    if (!teacher.classes.map(id => id.toString()).includes(class_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const attendanceRecords = await Attendance.find({ class_id, student_id })
      .sort({ date: -1 })
      .lean();

    const attendance = attendanceRecords.map(att => ({
      date: att.date,
      status: att.status,
      note: att.note
    }));

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const total = attendance.length;

    res.json({
      attendance,
      statistics: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total,
        attendance_rate: total > 0 ? parseFloat(((presentCount / total) * 100).toFixed(1)) : 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};