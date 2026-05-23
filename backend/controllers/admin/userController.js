const UserSiswa = require('../../models/UserSiswa');
const UserGuru = require('../../models/UserGuru');
const UserOrtu = require('../../models/UserOrtu');
const UserAdmin = require('../../models/UserAdmin');
const Class = require('../../models/Class');
const Subject = require('../../models/Subject');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongoose').Types;

// Helper untuk validasi ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

// ============================================
// ADMIN: GET ALL STUDENTS (dengan lookup class)
// ============================================
exports.getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    let query = {};

    // Filter berdasarkan nama kelas (bukan id)
    if (req.query.class) {
      const classDoc = await Class.findOne({ name: req.query.class }).lean();
      if (classDoc) {
        query.class_id = classDoc._id;
      } else {
        query.class_id = null;
      }
    }

    // Aggregation pipeline untuk join dengan classes
    const pipeline = [
      { $match: query },
      { $lookup: {
        from: 'classes',
        localField: 'class_id',
        foreignField: '_id',
        as: 'class_info'
      }},
      { $addFields: {
        class_name: { $arrayElemAt: ['$class_info.name', 0] },
        class_grade: { $arrayElemAt: ['$class_info.grade_level', 0] }
      }},
      { $project: { password: 0, class_info: 0 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const students = await UserSiswa.aggregate(pipeline);
    const total = await UserSiswa.countDocuments(query);

    // Konversi ObjectId ke string dan tambahkan field 'class' untuk frontend
    const studentsFormatted = students.map(s => ({
      ...s,
      _id: s._id.toString(),
      class_id: s.class_id ? s.class_id.toString() : null,
      parent_id: s.parent_id ? s.parent_id.toString() : null,
      academic_year_id: s.academic_year_id ? s.academic_year_id.toString() : null,
      class: s.class_name || '-'
    }));

    res.json({
      students: studentsFormatted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: CREATE STUDENT
// ============================================
exports.createStudent = async (req, res) => {
  try {
    const data = req.body;
    const required = ['full_name', 'email', 'username', 'password', 'nis', 'class_id', 'academic_year_id'];
    for (let field of required) {
      if (!data[field]) {
        return res.status(400).json({ error: `${field} wajib diisi` });
      }
    }

    // Validasi email dan NIS unik
    const existingEmail = await UserSiswa.findOne({ email: data.email });
    if (existingEmail) return res.status(400).json({ error: 'Email sudah terdaftar' });
    const existingNis = await UserSiswa.findOne({ nis: data.nis });
    if (existingNis) return res.status(400).json({ error: 'NIS sudah terdaftar' });

    // Validasi ObjectId
    if (!isValidObjectId(data.class_id)) return res.status(400).json({ error: 'class_id tidak valid' });
    if (!isValidObjectId(data.academic_year_id)) return res.status(400).json({ error: 'academic_year_id tidak valid' });

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newStudent = {
      full_name: data.full_name,
      email: data.email,
      username: data.username,
      password: hashedPassword,
      nis: data.nis,
      role: 'siswa',
      class_id: new ObjectId(data.class_id),
      academic_year_id: new ObjectId(data.academic_year_id),
      parent_id: (data.parent_id && isValidObjectId(data.parent_id)) ? new ObjectId(data.parent_id) : null,
      status: data.status || 'active',
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await UserSiswa.create(newStudent);
    res.status(201).json({ message: 'Siswa berhasil ditambahkan', student_id: result._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: UPDATE STUDENT
// ============================================
exports.updateStudent = async (req, res) => {
  try {
    const studentId = req.params.student_id;
    const data = req.body;
    if (!data) return res.status(400).json({ error: 'Data tidak valid' });
    if (!isValidObjectId(studentId)) return res.status(400).json({ error: 'ID siswa tidak valid' });

    const student = await UserSiswa.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    const updateData = { updated_at: new Date() };
    const allowedFields = ['full_name', 'email', 'username', 'nis', 'status', 'academic_year_id'];
    for (let field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    // Update password jika ada
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Handle class: frontend kirim 'class' (nama kelas string)
    if (data.class !== undefined) {
      if (data.class && typeof data.class === 'string') {
        const classDoc = await Class.findOne({ name: data.class });
        if (!classDoc) return res.status(400).json({ error: `Kelas "${data.class}" tidak ditemukan` });
        updateData.class_id = classDoc._id;
      } else {
        updateData.class_id = null;
      }
    }

    // Handle is_active -> status (untuk siswa)
    if (data.is_active !== undefined) {
      updateData.status = data.is_active ? 'active' : 'inactive';
    }

    await UserSiswa.findByIdAndUpdate(studentId, { $set: updateData });
    res.json({ message: 'Data siswa berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: DELETE STUDENT
// ============================================
exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.student_id;
    if (!isValidObjectId(studentId)) return res.status(400).json({ error: 'ID siswa tidak valid' });
    const result = await UserSiswa.findByIdAndDelete(studentId);
    if (!result) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    res.json({ message: 'Siswa berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: RESET PASSWORD SISWA
// ============================================
exports.resetStudentPassword = async (req, res) => {
  try {
    const studentId = req.params.student_id;
    const newPassword = req.body.new_password || 'siswa123';
    if (!isValidObjectId(studentId)) return res.status(400).json({ error: 'ID siswa tidak valid' });
    const student = await UserSiswa.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await UserSiswa.findByIdAndUpdate(studentId, { password: hashed, updated_at: new Date() });
    res.json({ message: `Password berhasil direset menjadi "${newPassword}"` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: GET ALL TEACHERS (dengan lookup subjects & classes)
// ============================================
exports.getTeachers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $skip: skip },
      { $limit: limit },
      { $lookup: {
        from: 'subjects',
        localField: 'subjects',
        foreignField: '_id',
        as: 'subject_details'
      }},
      { $lookup: {
        from: 'classes',
        localField: 'classes',
        foreignField: '_id',
        as: 'class_details'
      }},
      { $addFields: {
        subject_ids: '$subjects',
        class_ids: '$classes',
        subjects: { $map: { input: '$subject_details', as: 's', in: '$$s.name' } },
        classes: { $map: { input: '$class_details', as: 'c', in: '$$c.name' } }
      }},
      { $project: { password: 0, subject_details: 0, class_details: 0 } }
    ];

    const teachers = await UserGuru.aggregate(pipeline);
    const total = await UserGuru.countDocuments();

    const teachersFormatted = teachers.map(t => ({
      ...t,
      _id: t._id.toString(),
      subject_ids: (t.subject_ids || []).map(id => id.toString()),
      class_ids: (t.class_ids || []).map(id => id.toString()),
      subjects: t.subjects || [],
      classes: t.classes || []
    }));

    res.json({
      teachers: teachersFormatted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: CREATE TEACHER
// ============================================
exports.createTeacher = async (req, res) => {
  try {
    const data = req.body;
    const required = ['full_name', 'email', 'username', 'password', 'nip'];
    for (let field of required) {
      if (!data[field]) return res.status(400).json({ error: `${field} wajib diisi` });
    }

    const existingEmail = await UserGuru.findOne({ email: data.email });
    if (existingEmail) return res.status(400).json({ error: 'Email sudah terdaftar' });
    const existingNip = await UserGuru.findOne({ nip: data.nip });
    if (existingNip) return res.status(400).json({ error: 'NIP sudah terdaftar' });

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newTeacher = {
      full_name: data.full_name,
      email: data.email,
      username: data.username,
      password: hashedPassword,
      nip: data.nip,
      role: 'guru',
      subjects: (data.subjects || []).filter(id => isValidObjectId(id)).map(id => new ObjectId(id)),
      classes: (data.classes || []).filter(id => isValidObjectId(id)).map(id => new ObjectId(id)),
      phone: data.phone || '',
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await UserGuru.create(newTeacher);
    res.status(201).json({ message: 'Guru berhasil ditambahkan', teacher_id: result._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: UPDATE TEACHER
// ============================================
exports.updateTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacher_id;
    const data = req.body;
    if (!data) return res.status(400).json({ error: 'Data tidak valid' });
    if (!isValidObjectId(teacherId)) return res.status(400).json({ error: 'ID guru tidak valid' });

    const teacher = await UserGuru.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan' });

    const updateData = { updated_at: new Date() };
    const allowedFields = ['full_name', 'email', 'username', 'nip', 'phone', 'is_active', 'teacher_code'];
    for (let field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    // Update subjects (array of ObjectId)
    if (data.subjects !== undefined) {
      updateData.subjects = data.subjects.filter(id => isValidObjectId(id)).map(id => new ObjectId(id));
    }
    // Update classes
    if (data.classes !== undefined) {
      updateData.classes = data.classes.filter(id => isValidObjectId(id)).map(id => new ObjectId(id));
    }

    // Update password jika ada
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await UserGuru.findByIdAndUpdate(teacherId, { $set: updateData });
    res.json({ message: 'Data guru berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: DELETE TEACHER
// ============================================
exports.deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.teacher_id;
    if (!isValidObjectId(teacherId)) return res.status(400).json({ error: 'ID guru tidak valid' });
    const result = await UserGuru.findByIdAndDelete(teacherId);
    if (!result) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    res.json({ message: 'Guru berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: RESET PASSWORD GURU
// ============================================
exports.resetTeacherPassword = async (req, res) => {
  try {
    const teacherId = req.params.teacher_id;
    const newPassword = req.body.new_password || 'guru123';
    if (!isValidObjectId(teacherId)) return res.status(400).json({ error: 'ID guru tidak valid' });
    const teacher = await UserGuru.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await UserGuru.findByIdAndUpdate(teacherId, { password: hashed, updated_at: new Date() });
    res.json({ message: `Password berhasil direset menjadi "${newPassword}"` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: GET ALL ADMINS
// ============================================
exports.getAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const admins = await UserAdmin.find({}).skip(skip).limit(limit).lean();
    const total = await UserAdmin.countDocuments();

    const adminsFormatted = admins.map(a => {
      const { password, ...rest } = a;
      rest._id = rest._id.toString();
      return rest;
    });

    res.json({
      admins: adminsFormatted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================
// ADMIN: GET ALL PARENTS
// ============================================
exports.getParents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const parents = await UserOrtu.find({}).skip(skip).limit(limit).lean();
    const total = await UserOrtu.countDocuments();

    const parentsFormatted = parents.map(p => {
      const { password, ...rest } = p;
      rest._id = rest._id.toString();
      if (rest.children && Array.isArray(rest.children)) {
        rest.children = rest.children.map(c => c.toString());
      }
      return rest;
    });

    res.json({
      parents: parentsFormatted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};