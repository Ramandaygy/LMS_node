const Class = require('../../models/Class');
const UserSiswa = require('../../models/UserSiswa');

// GET /students - Guru melihat siswa binaan
exports.getMyStudents = async (req, res) => {
  try {
    const teacherId = req.user.id; // dari middleware auth

    // 1. Cari semua kelas di mana guru menjadi homeroom_teacher dan is_active true
    const classes = await Class.find({
      homeroom_teacher: teacherId,
      is_active: true
    }).lean();

    if (!classes.length) {
      return res.json({ students: [] });
    }

    const classIds = classes.map(cls => cls._id);

    // 2. Ambil semua siswa aktif dari kelas-kelas tersebut
    const students = await UserSiswa.find({
      class_id: { $in: classIds },
      role: 'siswa',
      status: 'active'
    }).lean();

    // 3. Buat mapping class_id -> class_name untuk efisiensi
    const classMap = new Map();
    classes.forEach(cls => {
      classMap.set(cls._id.toString(), cls.name);
    });

    const result = students.map(student => ({
      _id: student._id.toString(),
      full_name: student.full_name,
      nis: student.nis,
      class_name: classMap.get(student.class_id?.toString()) || 'Unknown',
      email: student.email,
      status: student.status,
      progress: 0,           // placeholder
      average_grade: '-'     // placeholder
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};