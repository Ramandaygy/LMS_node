const mongoose = require('mongoose');
const attendanceService = require('../services/attendanceService');

// GET /guru/attendance/classes
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

// GET /guru/attendance/students/:classId
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

// GET /guru/attendance?class_id=...&date=...
exports.getAttendance = async (req, res) => {
  try {
    const { class_id, date } = req.query;
    const teacherId = req.user.id;
    if (!class_id || !date) {
      return res.status(400).json({ error: 'class_id dan date diperlukan' });
    }
    const attendance = await attendanceService.getAttendanceByClassAndDate(class_id, date, teacherId);
    return res.json({ attendance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /guru/attendance/save
exports.saveAttendance = async (req, res) => {
  try {
    const { attendance, class_id, date } = req.body;
    const teacherId = req.user.id;
    if (!attendance || !class_id || !date) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    await attendanceService.saveAttendance(attendance, class_id, date, teacherId);
    return res.json({ success: true, message: 'Absensi berhasil disimpan' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// ========== UNTUK SISWA ==========
exports.getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.user.id; // dari token JWT
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

// ========== UNTUK ORANG TUA ==========
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

    // Ambil nama kelas untuk setiap anak
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