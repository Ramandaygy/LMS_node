const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongoose').Types;
const Class = require('../../models/Class');
const UserSiswa = require('../../models/UserSiswa');
const UserGuru = require('../../models/UserGuru');
const UserOrtu = require('../../models/UserOrtu');
const Subject = require('../../models/Subject');
const AcademicYear = require('../../models/AcademicYear');
const Assignment = require('../../models/Assignment');
const Schedule = require('../../models/Schedule');

// Helper: convert array of ObjectId to comma-separated string
const joinIds = (arr, field = 'name') => {
  if (!arr || !arr.length) return '';
  // Jika arr berisi object (populated) ambil field tertentu, misal name
  if (arr[0] && typeof arr[0] === 'object') {
    return arr.map(item => item[field]).join(', ');
  }
  return arr.join(', ');
};

// ------------------------------------------------------------
// 1. EXPORT KELAS
// ------------------------------------------------------------
exports.exportClasses = async (req, res) => {
  try {
    const pipeline = [
      { $lookup: { from: 'users_guru', localField: 'homeroom_teacher', foreignField: '_id', as: 'wali_kelas' } },
      { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: '_id', as: 'tahun_ajaran' } },
      { $project: {
        _id: 0,
        name: 1,
        grade_level: 1,
        wali_kelas: { $arrayElemAt: ['$wali_kelas.full_name', 0] },
        tahun_ajaran: { $arrayElemAt: ['$tahun_ajaran.name', 0] }
      }}
    ];
    const classes = await Class.aggregate(pipeline);
    const ws = XLSX.utils.json_to_sheet(classes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kelas');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=kelas.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal export kelas: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 2. IMPORT KELAS
// ------------------------------------------------------------
exports.importClasses = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let success = 0;
    let errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name?.toString().trim();
      if (!name) {
        errors.push(`Baris ${i+2}: Nama kelas kosong`);
        continue;
      }
      const existing = await Class.findOne({ name });
      if (existing) {
        errors.push(`Baris ${i+2}: Kelas '${name}' sudah ada`);
        continue;
      }

      let gradeLevel = row.grade_level;
      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
        const num = parseInt(gradeLevel);
        if (isNaN(num)) {
          errors.push(`Baris ${i+2}: grade_level harus angka`);
          continue;
        }
        gradeLevel = num;
      } else {
        gradeLevel = null;
      }

      let homeroomId = null;
      if (row.wali_kelas) {
        const wali = row.wali_kelas.toString().trim();
        const guru = await UserGuru.findOne({ full_name: wali });
        if (guru) homeroomId = guru._id;
        else errors.push(`Baris ${i+2}: Guru '${wali}' tidak ditemukan`);
      }

      let yearId = null;
      if (row.tahun_ajaran) {
        const tahun = row.tahun_ajaran.toString().trim();
        const year = await AcademicYear.findOne({ name: tahun });
        if (year) yearId = year._id;
        else errors.push(`Baris ${i+2}: Tahun ajaran '${tahun}' tidak ditemukan`);
      }

      const newClass = {
        name,
        grade_level: gradeLevel,
        homeroom_teacher: homeroomId,
        academic_year_id: yearId,
        created_at: new Date(),
        updated_at: new Date()
      };
      await Class.create(newClass);
      success++;
    }
    res.json({ message: 'Import kelas selesai', success_count: success, error_count: errors.length, errors: errors.slice(0,10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import kelas: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 3. EXPORT SISWA
// ------------------------------------------------------------
exports.exportStudents = async (req, res) => {
  try {
    const pipeline = [
      { $lookup: { from: 'classes', localField: 'class_id', foreignField: '_id', as: 'kelas' } },
      { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: '_id', as: 'tahun_ajaran' } },
      { $lookup: { from: 'users_ortu', localField: 'parent_id', foreignField: '_id', as: 'orang_tua' } },
      { $project: {
        _id: 0,
        nis: 1,
        full_name: 1,
        email: 1,
        username: 1,
        status: 1,
        class_name: { $arrayElemAt: ['$kelas.name', 0] },
        academic_year: { $arrayElemAt: ['$tahun_ajaran.name', 0] },
        orang_tua_nama: { $arrayElemAt: ['$orang_tua.full_name', 0] },
        created_at: 1
      }}
    ];
    let students = await UserSiswa.aggregate(pipeline);
    students = students.map(s => {
      if (s.created_at) s.created_at = s.created_at.toISOString();
      return s;
    });
    const ws = XLSX.utils.json_to_sheet(students);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=siswa.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal export siswa: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 4. IMPORT SISWA
// ------------------------------------------------------------
exports.importStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    // Gabungkan semua sheet
    let allRows = [];
    workbook.SheetNames.forEach(sheetName => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      // Jika tidak ada kolom class_name, gunakan nama sheet sebagai class_name
      rows.forEach(row => {
        if (!row.class_name && sheetName !== 'Template_Siswa') {
          row.class_name = sheetName;
        }
      });
      allRows.push(...rows);
    });

    const requiredCols = ['nis', 'full_name', 'email'];
    const firstRow = allRows[0];
    if (!firstRow) return res.status(400).json({ error: 'Tidak ada data' });
    for (let col of requiredCols) {
      if (!firstRow.hasOwnProperty(col)) {
        return res.status(400).json({ error: `Kolom "${col}" tidak ditemukan` });
      }
    }
    if (!firstRow.hasOwnProperty('class_name')) {
      return res.status(400).json({ error: 'Kolom "class_name" tidak ditemukan' });
    }

    let success = 0;
    let errors = [];
    const defaultPassword = 'siswa123';
    const hashedDefault = await bcrypt.hash(defaultPassword, 10);

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      try {
        const nis = row.nis?.toString().trim();
        const fullName = row.full_name?.toString().trim();
        const email = row.email?.toString().trim().toLowerCase();
        const className = row.class_name?.toString().trim();
        const statusRaw = row.status?.toString().trim().toLowerCase() || 'active';
        const academicYearName = row.academic_year?.toString().trim();
        const parentName = row.orang_tua_nama?.toString().trim();

        if (!nis || !fullName || !email || !className) {
          errors.push(`Baris ${i+2}: Data tidak lengkap (nis, full_name, email, class_name wajib)`);
          continue;
        }

        const existingNis = await UserSiswa.findOne({ nis });
        if (existingNis) {
          errors.push(`Baris ${i+2}: NIS ${nis} sudah ada`);
          continue;
        }
        const existingEmail = await UserSiswa.findOne({ email });
        if (existingEmail) {
          errors.push(`Baris ${i+2}: Email ${email} sudah ada`);
          continue;
        }

        const classDoc = await Class.findOne({ name: className });
        if (!classDoc) {
          errors.push(`Baris ${i+2}: Kelas '${className}' tidak ditemukan`);
          continue;
        }

        let yearId = null;
        if (academicYearName) {
          const yearDoc = await AcademicYear.findOne({ name: academicYearName });
          if (yearDoc) yearId = yearDoc._id;
          else {
            errors.push(`Baris ${i+2}: Tahun ajaran '${academicYearName}' tidak ditemukan`);
            continue;
          }
        } else {
          const activeYear = await AcademicYear.findOne({ is_active: true });
          if (activeYear) yearId = activeYear._id;
          else {
            errors.push(`Baris ${i+2}: Tidak ada tahun ajaran aktif, silakan tentukan academic_year`);
            continue;
          }
        }

        let parentId = null;
        if (parentName) {
          const parent = await UserOrtu.findOne({ full_name: parentName });
          if (parent) parentId = parent._id;
          else errors.push(`Baris ${i+2}: Orang tua '${parentName}' tidak ditemukan`);
        }

        let username = email.split('@')[0];
        const existingUsername = await UserSiswa.findOne({ username });
        if (existingUsername) {
          username = `${username}${nis.slice(-3)}`;
        }

        const newStudent = {
          nis,
          full_name: fullName,
          email,
          username,
          password: hashedDefault,
          role: 'siswa',
          class_id: classDoc._id,
          parent_id: parentId,
          academic_year_id: yearId,
          status: statusRaw === 'active' ? 'active' : 'inactive',
          profile: { avatar: null, bio: '', phone: '', address: '' },
          created_at: new Date(),
          updated_at: new Date()
        };
        await UserSiswa.create(newStudent);
        success++;
      } catch (err) {
        errors.push(`Baris ${i+2}: ${err.message}`);
      }
    }
    res.json({
      message: 'Import siswa selesai',
      success_count: success,
      error_count: errors.length,
      errors: errors.slice(0,20),
      default_password: defaultPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import siswa: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 5. EXPORT GURU
// ------------------------------------------------------------
exports.exportTeachers = async (req, res) => {
  try {
    const pipeline = [
      { $lookup: { from: 'subjects', localField: 'subjects', foreignField: '_id', as: 'subject_details' } },
      { $lookup: { from: 'classes', localField: 'classes', foreignField: '_id', as: 'class_details' } },
      { $project: {
        _id: 0,
        nip: 1,
        full_name: 1,
        email: 1,
        username: 1,
        teacher_code: { $ifNull: ['$teacher_code', '$username'] },
        subjects: { $map: { input: '$subject_details', as: 's', in: '$$s.name' } },
        classes: { $map: { input: '$class_details', as: 'c', in: '$$c.name' } },
        is_active: 1,
        phone: 1
      }}
    ];
    let teachers = await UserGuru.aggregate(pipeline);
    teachers = teachers.map(t => ({
      ...t,
      subjects: t.subjects ? t.subjects.join(', ') : '',
      classes: t.classes ? t.classes.join(', ') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(teachers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guru');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=guru.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal export guru: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 6. IMPORT GURU
// ------------------------------------------------------------
exports.importTeachers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const requiredCols = ['nip', 'full_name', 'email', 'username'];
    const firstRow = rows[0];
    if (!firstRow) return res.status(400).json({ error: 'Tidak ada data' });
    for (let col of requiredCols) {
      if (!firstRow.hasOwnProperty(col)) {
        return res.status(400).json({ error: `Kolom "${col}" tidak ditemukan` });
      }
    }

    // Pre-fetch semua subjects untuk lookup case-insensitive
    const allSubjects = await Subject.find({}, { name: 1, _id: 1 });
    const subjectMap = new Map();
    allSubjects.forEach(s => subjectMap.set(s.name.trim().toLowerCase(), s._id));

    let success = 0;
    let errors = [];
    const defaultPassword = 'guru123';
    const hashedDefault = await bcrypt.hash(defaultPassword, 10);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nip = row.nip?.toString().trim();
        const fullName = row.full_name?.toString().trim();
        const email = row.email?.toString().trim().toLowerCase();
        const username = row.username?.toString().trim();
        const teacherCode = row.teacher_code?.toString().trim() || username;
        const subjectsStr = row.subjects?.toString().trim() || '';
        const classesStr = row.classes?.toString().trim() || '';
        const phone = row.phone?.toString().trim() || '';

        if (!nip || !fullName || !email || !username) {
          errors.push(`Baris ${i+2}: Data tidak lengkap (nip, full_name, email, username wajib)`);
          continue;
        }

        const existingNip = await UserGuru.findOne({ nip });
        if (existingNip) {
          errors.push(`Baris ${i+2}: NIP ${nip} sudah ada`);
          continue;
        }
        const existingEmail = await UserGuru.findOne({ email });
        if (existingEmail) {
          errors.push(`Baris ${i+2}: Email ${email} sudah ada`);
          continue;
        }

        // Process subjects
        const subjectIds = [];
        if (subjectsStr) {
          const subjectNames = subjectsStr.split(',').map(s => s.trim()).filter(s => s);
          for (let sn of subjectNames) {
            const key = sn.toLowerCase();
            if (subjectMap.has(key)) subjectIds.push(subjectMap.get(key));
            else errors.push(`Baris ${i+2}: Mata pelajaran '${sn}' tidak ditemukan (diabaikan)`);
          }
        }

        // Process classes
        const classIds = [];
        if (classesStr) {
          const classNames = classesStr.split(',').map(c => c.trim()).filter(c => c);
          for (let cn of classNames) {
            const cls = await Class.findOne({ name: cn });
            if (cls) classIds.push(cls._id);
            else errors.push(`Baris ${i+2}: Kelas '${cn}' tidak ditemukan (diabaikan)`);
          }
        }

        const newTeacher = {
          nip,
          full_name: fullName,
          email,
          username,
          teacher_code: teacherCode,
          password: hashedDefault,
          role: 'guru',
          subjects: subjectIds,
          classes: classIds,
          phone,
          is_active: true,
          profile: { avatar: null, bio: '', address: '' },
          created_at: new Date(),
          updated_at: new Date()
        };
        await UserGuru.create(newTeacher);
        success++;
      } catch (err) {
        errors.push(`Baris ${i+2}: ${err.message}`);
      }
    }
    res.json({
      message: 'Import guru selesai',
      success_count: success,
      error_count: errors.length,
      errors: errors.slice(0,10),
      default_password: defaultPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import guru: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 7. EXPORT TAHUN AJARAN
// ------------------------------------------------------------
exports.exportAcademicYears = async (req, res) => {
  try {
    let years = await AcademicYear.find({}, { _id: 0, name: 1, semester: 1, is_active: 1, start_date: 1, end_date: 1 }).lean();
    years = years.map(y => ({
      ...y,
      start_date: y.start_date ? (y.start_date instanceof Date ? y.start_date.toISOString().split('T')[0] : y.start_date) : '',
      end_date: y.end_date ? (y.end_date instanceof Date ? y.end_date.toISOString().split('T')[0] : y.end_date) : ''
    }));
    const ws = XLSX.utils.json_to_sheet(years);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TahunAjaran');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=tahun_ajaran.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal export tahun ajaran: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 8. IMPORT TAHUN AJARAN
// ------------------------------------------------------------
exports.importAcademicYears = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (!rows.length) return res.status(400).json({ error: 'Tidak ada data' });
    if (!rows[0].hasOwnProperty('name')) {
      return res.status(400).json({ error: 'Kolom "name" tidak ditemukan' });
    }

    // Cek apakah ada yang is_active=true, jika ada, set semua yang lain false dulu
    let hasActive = rows.some(row => row.is_active === true || row.is_active === 'true' || row.is_active === 1 || row.is_active === '1');
    if (hasActive) {
      await AcademicYear.updateMany({}, { $set: { is_active: false } });
    }

    let success = 0;
    let errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = row.name?.toString().trim();
        if (!name) {
          errors.push(`Baris ${i+2}: Nama tahun ajaran kosong`);
          continue;
        }
        const existing = await AcademicYear.findOne({ name });
        if (existing) {
          errors.push(`Baris ${i+2}: Tahun ajaran '${name}' sudah ada`);
          continue;
        }

        let semester = row.semester?.toString().trim() || '';
        let isActive = false;
        if (row.is_active !== undefined && row.is_active !== null && row.is_active !== '') {
          const val = row.is_active.toString().toLowerCase();
          isActive = (val === 'true' || val === '1' || val === 'yes' || val === 'active');
        }

        let startDate = null, endDate = null;
        if (row.start_date) {
          const date = new Date(row.start_date);
          if (!isNaN(date.getTime())) startDate = date;
          else errors.push(`Baris ${i+2}: Format start_date tidak valid`);
        }
        if (row.end_date) {
          const date = new Date(row.end_date);
          if (!isNaN(date.getTime())) endDate = date;
          else errors.push(`Baris ${i+2}: Format end_date tidak valid`);
        }

        const newYear = {
          name,
          semester,
          is_active: isActive,
          start_date: startDate,
          end_date: endDate,
          created_at: new Date(),
          updated_at: new Date()
        };
        await AcademicYear.create(newYear);
        success++;
      } catch (err) {
        errors.push(`Baris ${i+2}: ${err.message}`);
      }
    }
    res.json({ message: 'Import tahun ajaran selesai', success_count: success, error_count: errors.length, errors: errors.slice(0,10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import tahun ajaran: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 9. EXPORT ORANG TUA
// ------------------------------------------------------------
exports.exportParents = async (req, res) => {
  try {
    const pipeline = [
      { $lookup: { from: 'users_siswa', localField: 'children', foreignField: '_id', as: 'anak' } },
      { $project: {
        _id: 0,
        nik: 1,
        full_name: 1,
        email: 1,
        username: 1,
        phone: 1,
        anak_nama: { $map: { input: '$anak', as: 'a', in: '$$a.full_name' } }
      }}
    ];
    let parents = await UserOrtu.aggregate(pipeline);
    parents = parents.map(p => ({
      ...p,
      anak: p.anak_nama ? p.anak_nama.join(', ') : ''
    }));
    const ws = XLSX.utils.json_to_sheet(parents);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OrangTua');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=orang_tua.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal export orang tua: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 10. IMPORT ORANG TUA
// ------------------------------------------------------------
exports.importParents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const requiredCols = ['nik', 'full_name', 'email', 'username'];
    if (!rows.length) return res.status(400).json({ error: 'Tidak ada data' });
    for (let col of requiredCols) {
      if (!rows[0].hasOwnProperty(col)) {
        return res.status(400).json({ error: `Kolom "${col}" tidak ditemukan` });
      }
    }

    let success = 0;
    let errors = [];
    const defaultPassword = 'ortu123';
    const hashedDefault = await bcrypt.hash(defaultPassword, 10);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nik = row.nik?.toString().trim();
        const fullName = row.full_name?.toString().trim();
        const email = row.email?.toString().trim().toLowerCase();
        const username = row.username?.toString().trim();
        const phone = row.phone?.toString().trim() || '';
        const anakNisStr = row.anak?.toString().trim() || '';

        if (!nik || !fullName || !email || !username) {
          errors.push(`Baris ${i+2}: Data tidak lengkap (nik, full_name, email, username wajib)`);
          continue;
        }
        const existingNik = await UserOrtu.findOne({ nik });
        if (existingNik) {
          errors.push(`Baris ${i+2}: NIK ${nik} sudah ada`);
          continue;
        }
        const existingEmail = await UserOrtu.findOne({ email });
        if (existingEmail) {
          errors.push(`Baris ${i+2}: Email ${email} sudah ada`);
          continue;
        }

        const anakIds = [];
        if (anakNisStr) {
          const nisList = anakNisStr.split(',').map(n => n.trim()).filter(n => n);
          for (let nis of nisList) {
            const student = await UserSiswa.findOne({ nis });
            if (student) anakIds.push(student._id);
            else errors.push(`Baris ${i+2}: Siswa dengan NIS '${nis}' tidak ditemukan`);
          }
        }

        const newParent = {
          nik,
          full_name: fullName,
          email,
          username,
          password: hashedDefault,
          role: 'ortu',
          children: anakIds,
          phone,
          profile: { avatar: null, bio: '', address: '' },
          created_at: new Date(),
          updated_at: new Date()
        };
        await UserOrtu.create(newParent);
        success++;
      } catch (err) {
        errors.push(`Baris ${i+2}: ${err.message}`);
      }
    }
    res.json({
      message: 'Import orang tua selesai',
      success_count: success,
      error_count: errors.length,
      errors: errors.slice(0,10),
      default_password: defaultPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import orang tua: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 11. EXPORT MATA PELAJARAN
// ------------------------------------------------------------
exports.exportSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({}, { _id: 0, name: 1, code: 1, description: 1, is_active: 1 }).lean();
    const ws = XLSX.utils.json_to_sheet(subjects);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MataPelajaran');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=mata_pelajaran.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal export mata pelajaran: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 12. IMPORT MATA PELAJARAN
// ------------------------------------------------------------
exports.importSubjects = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (!rows.length) return res.status(400).json({ error: 'Tidak ada data' });
    if (!rows[0].hasOwnProperty('name')) {
      return res.status(400).json({ error: 'Kolom "name" tidak ditemukan' });
    }

    let success = 0;
    let errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = row.name?.toString().trim();
        if (!name) {
          errors.push(`Baris ${i+2}: Nama mata pelajaran kosong`);
          continue;
        }
        const existing = await Subject.findOne({ name });
        if (existing) {
          errors.push(`Baris ${i+2}: Mata pelajaran '${name}' sudah ada`);
          continue;
        }
        const code = row.code?.toString().trim() || '';
        const description = row.description?.toString().trim() || '';
        let isActive = true;
        if (row.is_active !== undefined && row.is_active !== null && row.is_active !== '') {
          const val = row.is_active.toString().toLowerCase();
          isActive = (val === 'true' || val === '1' || val === 'yes' || val === 'active');
        }

        const newSubject = {
          name,
          code,
          description,
          is_active: isActive,
          created_at: new Date(),
          updated_at: new Date()
        };
        await Subject.create(newSubject);
        success++;
      } catch (err) {
        errors.push(`Baris ${i+2}: ${err.message}`);
      }
    }
    res.json({ message: 'Import mata pelajaran selesai', success_count: success, error_count: errors.length, errors: errors.slice(0,10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal import mata pelajaran: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 13. DOWNLOAD TEMPLATE SISWA
// ------------------------------------------------------------
exports.exportStudentsTemplate = async (req, res) => {
  try {
    const headers = ['email', 'nis', 'full_name', 'class_name', 'status', 'academic_year', 'orang_tua_nama'];
    const ws = XLSX.utils.json_to_sheet([]);
    // Write headers manually
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=template_siswa.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal membuat template: ${err.message}` });
  }
};

// ------------------------------------------------------------
// 14. DOWNLOAD TEMPLATE GURU
// ------------------------------------------------------------
exports.exportTeachersTemplate = async (req, res) => {
  try {
    const headers = ['nip', 'full_name', 'email', 'username', 'teacher_code', 'subjects', 'classes', 'phone'];
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Guru');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=template_guru.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Gagal membuat template: ${err.message}` });
  }
};