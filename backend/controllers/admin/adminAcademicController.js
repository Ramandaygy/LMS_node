const AcademicYear = require('../../models/AcademicYear');
const UserSiswa = require('../../models/UserSiswa');
const ClassHistory = require('../../models/ClassHistory');
const Class = require('../../models/Class');
const { ObjectId } = require('mongoose').Types;

// GET /academic-years
exports.getAllAcademicYears = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    let filters = {};
    if (req.query.is_active !== undefined) {
      filters.is_active = req.query.is_active === 'true';
    }
    const academicYears = await AcademicYear.find(filters).skip(skip).limit(limit).lean();
    const total = await AcademicYear.countDocuments(filters);
    academicYears.forEach(y => { y._id = y._id.toString(); });
    res.json({ academic_years: academicYears, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /academic-years/options
exports.academicYearOptions = async (req, res) => {
  try {
    const years = await AcademicYear.find({}, { _id: 1, year: 1, is_active: 1 }).sort({ year: -1 }).lean();
    years.forEach(y => { y._id = y._id.toString(); });
    res.json({ academic_years: years });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /academic-years
exports.createAcademicYear = async (req, res) => {
  try {
    const data = req.body;
    const yearValue = data.year || data.name;
    if (!yearValue) return res.status(400).json({ error: 'Tahun ajaran (year) wajib diisi' });
    const existing = await AcademicYear.findOne({ year: yearValue });
    if (existing) return res.status(400).json({ error: `Tahun ajaran ${yearValue} sudah ada` });
    if (data.is_active) {
      await AcademicYear.updateMany({}, { $set: { is_active: false } });
    }
    const newYear = new AcademicYear({
      year: yearValue,
      semester: data.semester || '',
      is_active: data.is_active || false,
      start_date: data.start_date ? new Date(data.start_date) : null,
      end_date: data.end_date ? new Date(data.end_date) : null,
      created_at: new Date(),
      updated_at: new Date()
    });
    const result = await newYear.save();
    res.status(201).json({ message: 'Tahun ajaran berhasil dibuat', academic_year_id: result._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /academic-years/:year_id
exports.updateAcademicYear = async (req, res) => {
  try {
    const yearId = req.params.year_id;
    const data = req.body;
    const existing = await AcademicYear.findById(yearId);
    if (!existing) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan' });
    if (data.is_active && !existing.is_active) {
      await AcademicYear.updateMany({}, { $set: { is_active: false } });
    }
    const updateData = { updated_at: new Date() };
    const allowed = ['year', 'semester', 'is_active', 'start_date', 'end_date'];
    allowed.forEach(field => {
      if (data[field] !== undefined) {
        if (field === 'start_date' || field === 'end_date') {
          updateData[field] = data[field] ? new Date(data[field]) : null;
        } else {
          updateData[field] = data[field];
        }
      }
    });
    await AcademicYear.findByIdAndUpdate(yearId, { $set: updateData });
    res.json({ message: 'Tahun ajaran berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /academic-years/:year_id
exports.deleteAcademicYear = async (req, res) => {
  try {
    const yearId = req.params.year_id;
    const usedInStudents = await UserSiswa.findOne({ academic_year_id: yearId });
    const usedInClassHistory = await ClassHistory.findOne({ academic_year_id: yearId.toString() });
    if (usedInStudents || usedInClassHistory) {
      return res.status(400).json({ error: 'Tahun ajaran tidak dapat dihapus karena sudah digunakan' });
    }
    const result = await AcademicYear.findByIdAndDelete(yearId);
    if (!result) return res.status(404).json({ error: 'Tahun ajaran tidak ditemukan' });
    res.json({ message: 'Tahun ajaran berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /academic-years/current
exports.getCurrentAcademicYear = async (req, res) => {
  try {
    const current = await AcademicYear.findOne({ is_active: true }).lean();
    if (current) current._id = current._id.toString();
    res.json({ current_year: current });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /academic-years/:year_id/students-by-class?class=className
exports.getStudentsByClassForPromotion = async (req, res) => {
  try {
    const className = req.query.class;
    if (!className) return res.status(400).json({ error: 'Parameter class required' });
    const classDoc = await Class.findOne({ name: className });
    if (!classDoc) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    const students = await UserSiswa.find({ role: 'siswa', status: 'active', class_id: classDoc._id }).lean();
    students.forEach(s => {
      s._id = s._id.toString();
      delete s.password;
    });
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /academic-years/:year_id/promote
exports.promoteStudents = async (req, res) => {
  try {
    const yearId = req.params.year_id;
    const { promotions, note } = req.body;
    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data promosi' });
    }
    const targetYear = await AcademicYear.findById(yearId);
    if (!targetYear) return res.status(404).json({ error: 'Tahun ajaran tujuan tidak ditemukan' });
    let updated = 0;
    let errors = [];
    for (const p of promotions) {
      const studentId = p.student_id;
      const newClassName = p.new_class;
      if (!studentId || !newClassName) {
        errors.push(`Data tidak lengkap: ${JSON.stringify(p)}`);
        continue;
      }
      if (!ObjectId.isValid(studentId)) {
        errors.push(`ID siswa tidak valid: ${studentId}`);
        continue;
      }
      const student = await UserSiswa.findById(studentId);
      if (!student) {
        errors.push(`Siswa tidak ditemukan: ${studentId}`);
        continue;
      }
      const classDoc = await Class.findOne({ name: newClassName });
      if (!classDoc) {
        errors.push(`Kelas baru '${newClassName}' tidak ditemukan untuk siswa ${studentId}`);
        continue;
      }
      const oldClassId = student.class_id;
      let oldClassName = null;
      if (oldClassId) {
        const oldClass = await Class.findById(oldClassId);
        oldClassName = oldClass ? oldClass.name : null;
      }
      student.class_id = classDoc._id;
      student.updated_at = new Date();
      await student.save();
      await ClassHistory.create({
        student_id: studentId,
        student_name: student.full_name,
        nis: student.nis,
        old_class: oldClassName,
        new_class: newClassName,
        academic_year_id: yearId,
        academic_year_name: targetYear.year,
        changed_by: req.user.id,
        changed_at: new Date(),
        note: note || 'Kenaikan kelas'
      });
      updated++;
    }
    res.json({ message: `${updated} siswa berhasil dipromosikan`, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /academic-years/:year_id/alumni
exports.getAlumniByYear = async (req, res) => {
  try {
    const yearId = req.params.year_id;
    if (!ObjectId.isValid(yearId)) return res.status(400).json({ error: 'ID tahun ajaran tidak valid' });
    const students = await UserSiswa.find({ role: 'siswa', status: 'alumni', graduation_year_id: yearId }).lean();
    students.forEach(s => {
      s._id = s._id.toString();
      delete s.password;
    });
    res.json({ alumni: students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /users/students/:student_id/graduate
exports.graduateStudent = async (req, res) => {
  try {
    const studentId = req.params.student_id;
    const { graduation_year_id } = req.body;
    if (!graduation_year_id || !ObjectId.isValid(graduation_year_id)) {
      return res.status(400).json({ error: 'Tahun lulus tidak valid' });
    }
    const student = await UserSiswa.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    let graduatedFromClass = null;
    if (student.class_id) {
      const cls = await Class.findById(student.class_id);
      graduatedFromClass = cls ? cls.name : null;
    }
    student.status = 'alumni';
    student.graduation_year_id = graduation_year_id;
    student.graduated_at = new Date();
    student.graduated_from_class = graduatedFromClass;
    await student.save();
    res.json({ message: 'Siswa berhasil diluluskan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};