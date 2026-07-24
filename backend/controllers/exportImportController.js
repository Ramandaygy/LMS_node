const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { logActivity } = require('../utils/activityLogger');

const getCollection = (name) => mongoose.connection.collection(name);

const sendExcelFile = async (res, workbook, filename) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
};

exports.exportClasses = async (req, res) => {
  try {
    const classes = await getCollection('classes').aggregate([
      { $lookup: { from: 'users_guru', localField: 'homeroom_teacher', foreignField: '_id', as: 'wali_kelas' } },
      { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: '_id', as: 'tahun_ajaran' } },
      { $project: { _id: 0, name: 1, grade_level: 1, wali_kelas: { $arrayElemAt: ['$wali_kelas.full_name', 0] }, tahun_ajaran: { $arrayElemAt: ['$tahun_ajaran.name', 0] } } }
    ]).toArray();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Kelas');
    worksheet.columns = [{ header: 'name', key: 'name', width: 20 }, { header: 'grade_level', key: 'grade_level', width: 15 }, { header: 'wali_kelas', key: 'wali_kelas', width: 30 }, { header: 'tahun_ajaran', key: 'tahun_ajaran', width: 20 }];
    classes.forEach(c => worksheet.addRow(c));
    await sendExcelFile(res, workbook, 'kelas.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal export kelas: ${error.message}` }); }
};

exports.importClasses = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);
    let headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => { headers[cell.value] = colNumber; });
    if (!headers['name']) return res.status(400).json({ error: 'Kolom "name" tidak ditemukan' });
    let success = 0, errors = [];
    const guruMap = await getCollection('users_guru').find({}).toArray();
    const yearMap = await getCollection('academic_years').find({}).toArray();
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.values.length) continue;
      try {
        const name = row.getCell(headers['name']).text?.trim();
        if (!name) { errors.push(`Baris ${i}: Nama kelas kosong`); continue; }
        if (await getCollection('classes').findOne({ name })) { errors.push(`Baris ${i}: Kelas '${name}' sudah ada`); continue; }
        let grade_level = row.getCell(headers['grade_level'] || -1).value;
        if (grade_level) grade_level = parseInt(grade_level) || null;
        let homeroom_id = null;
        if (headers['wali_kelas']) {
          const wali = row.getCell(headers['wali_kelas']).text?.trim();
          if (wali) {
            const guru = guruMap.find(g => g.full_name === wali);
            if (guru) homeroom_id = guru._id; else errors.push(`Baris ${i}: Guru '${wali}' tidak ditemukan`);
          }
        }
        let year_id = null;
        if (headers['tahun_ajaran']) {
          const tahun = row.getCell(headers['tahun_ajaran']).text?.trim();
          if (tahun) {
            const year = yearMap.find(y => y.name === tahun);
            if (year) year_id = year._id; else errors.push(`Baris ${i}: Tahun ajaran '${tahun}' tidak ditemukan`);
          }
        }
        await getCollection('classes').insertOne({ name, grade_level, homeroom_teacher: homeroom_id, academic_year_id: year_id, created_at: new Date(), updated_at: new Date() });
        success++;
      } catch (e) { errors.push(`Baris ${i}: ${e.message}`); }
    }
    res.json({ message: 'Import kelas selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 10) });
  } catch (error) { res.status(500).json({ error: `Gagal import kelas: ${error.message}` }); }
};

exports.exportStudents = async (req, res) => {
  try {
    const students = await getCollection('users_siswa').aggregate([
      { $lookup: { from: 'classes', localField: 'class_id', foreignField: '_id', as: 'kelas' } },
      { $lookup: { from: 'users_ortu', localField: 'parent_id', foreignField: '_id', as: 'orang_tua' } },
      {
        $project: {
          _id: 0,
          nis: 1,
          full_name: 1,
          class_name: { $arrayElemAt: ['$kelas.name', 0] },
          orang_tua_nama: { $arrayElemAt: ['$orang_tua.full_name', 0] },
          status: 1
        }
      }
    ]).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Siswa');
    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Lengkap', key: 'full_name', width: 30 },
      { header: 'Kelas', key: 'class_name', width: 15 },
      { header: 'Orang Tua / Wali', key: 'orang_tua_nama', width: 30 },
      { header: 'Status', key: 'status_formatted', width: 15 }
    ];

    students.forEach(s => {
      worksheet.addRow({
        nis: s.nis || '-',
        full_name: s.full_name || '-',
        class_name: s.class_name || '-',
        orang_tua_nama: s.orang_tua_nama || '-',
        status_formatted: s.status === 'active' ? 'Aktif' : 'Nonaktif'
      });
    });

    await sendExcelFile(res, workbook, 'laporan_siswa.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export siswa: ${error.message}` });
  }
};

exports.importStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    let success = 0, errors = [];
    const default_password = "siswa123";
    const hashed_default = await bcrypt.hash(default_password, 10);
    const ortu_default_password = "ortu123";
    const hashed_ortu_default = await bcrypt.hash(ortu_default_password, 10);
    const classesMap = await getCollection('classes').find({}).toArray();
    const yearMap = await getCollection('academic_years').find({}).toArray();
    const activeYear = yearMap.find(y => y.is_active === true);

    // Clean up invalid parent documents (e.g. empty name, spaces, dashes, nulls)
    const invalidParents = await getCollection('users_ortu').find({
      $or: [
        { full_name: { $in: ['', ' ', '-', 'null', 'n/a', 'tidak ada', null] } },
        { full_name: /^\s*$/ }
      ]
    }).toArray();
    const invalidParentIds = invalidParents.map(p => p._id);
    if (invalidParentIds.length > 0) {
      await getCollection('users_ortu').deleteMany({ _id: { $in: invalidParentIds } });
      await getCollection('users_siswa').updateMany(
        { parent_id: { $in: invalidParentIds } },
        { $set: { parent_id: null } }
      );
    }

    const parentMap = await getCollection('users_ortu').find({}).toArray();

    // Fetch existing students in-memory to prevent loop queries
    const existingStudents = await getCollection('users_siswa')
      .find({})
      .toArray();

    const studentNisSet = new Set(existingStudents.map(s => s.nis?.trim()));
    const studentEmailSet = new Set(existingStudents.map(s => s.email?.trim()?.toLowerCase()));
    const studentUsernameSet = new Set(existingStudents.map(s => s.username?.trim()));

    const studentsToInsert = [];

    for (const worksheet of workbook.worksheets) {
      let headers = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        if (cell.value) {
          headers[String(cell.value).trim().toLowerCase()] = colNumber;
        }
      });
      if (!headers['nis'] || !headers['full_name'] || !headers['email']) {
        errors.push(`Sheet ${worksheet.name}: Kolom wajib (nis, full_name, email) tidak lengkap`);
        continue;
      }

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row.values.length) continue;

        try {
          const getVal = (colKey) => {
            const colNum = headers[colKey];
            if (!colNum) return '';
            const cell = row.getCell(colNum);
            if (!cell || cell.value === null || cell.value === undefined) return '';
            if (typeof cell.value === 'object') {
              if (cell.value.text !== undefined) return String(cell.value.text).trim();
              if (cell.value.result !== undefined) return String(cell.value.result).trim();
              if (cell.value.hyperlink !== undefined) return String(cell.value.hyperlink).replace(/^mailto:/i, '').trim();
            }
            return String(cell.value).trim();
          };

          const nis = getVal('nis');
          const full_name = getVal('full_name');
          const email = getVal('email').toLowerCase();
          let class_name = getVal('class_name');
          if (!class_name) {
            class_name = worksheet.name.trim();
          }
          const status = getVal('status').toLowerCase() || 'active';
          const academic_year_name = getVal('academic_year');
          const parent_nama = getVal('orang_tua_nama');

          if (!nis || !full_name || !email) continue;

          if (studentNisSet.has(nis)) { errors.push(`Sheet ${worksheet.name} Baris ${i}: NIS ${nis} sudah ada`); continue; }
          if (studentEmailSet.has(email)) { errors.push(`Sheet ${worksheet.name} Baris ${i}: Email ${email} sudah ada`); continue; }

          const normalizeString = (str) => {
            if (!str) return '';
            return str.toLowerCase().replace(/[^a-z0-9]/g, '');
          };

          // Flexible Class Lookup
          let class_doc = classesMap.find(c => c.name.trim().toLowerCase() === class_name.toLowerCase());
          if (!class_doc) {
            const normInput = normalizeString(class_name);
            class_doc = classesMap.find(c => normalizeString(c.name) === normInput);
          }
          if (!class_doc) {
            const normInput = normalizeString(class_name);
            class_doc = classesMap.find(c => normalizeString(c.name).includes(normInput) || normInput.includes(normalizeString(c.name)));
          }
          if (!class_doc) {
            errors.push(`Sheet ${worksheet.name} Baris ${i}: Kelas '${class_name}' tidak ditemukan`);
            continue;
          }

          // Flexible Academic Year Lookup
          let year_id = null;
          if (academic_year_name) {
            const getYearVal = (y) => y.year || y.name || '';
            let year_doc = yearMap.find(y => getYearVal(y).trim().toLowerCase() === academic_year_name.toLowerCase());
            if (!year_doc) {
              const normInput = normalizeString(academic_year_name);
              year_doc = yearMap.find(y => normalizeString(getYearVal(y)) === normInput);
            }
            if (!year_doc) {
              const normInput = normalizeString(academic_year_name);
              year_doc = yearMap.find(y => normalizeString(getYearVal(y)).includes(normInput) || normInput.includes(normalizeString(getYearVal(y))));
            }
            // Fallback to active year if search failed
            if (!year_doc && activeYear) {
              year_doc = activeYear;
            }

            if (year_doc) {
              year_id = year_doc._id;
            } else {
              errors.push(`Sheet ${worksheet.name} Baris ${i}: Tahun ajaran '${academic_year_name}' tidak ditemukan`);
              continue;
            }
          } else {
            if (activeYear) year_id = activeYear._id;
            else { errors.push(`Sheet ${worksheet.name} Baris ${i}: Tidak ada tahun ajaran aktif`); continue; }
          }

          // Flexible Parent Lookup
          let parent_id = null;
          let student_id;

          const isValidParentName = (name) => {
            if (!name) return false;
            const clean = name.trim().toLowerCase();
            return clean !== '' && clean !== '-' && clean !== 'n/a' && clean !== 'null' && clean !== 'tidak ada';
          };

          if (parent_nama && isValidParentName(parent_nama)) {
            let parent = parentMap.find(p => p.full_name.trim().toLowerCase() === parent_nama.toLowerCase());
            if (!parent) {
              const normInput = normalizeString(parent_nama);
              parent = parentMap.find(p => normalizeString(p.full_name) === normInput);
            }

            const student_id_placeholder = new mongoose.Types.ObjectId();

            if (parent) {
              parent_id = parent._id;
            } else {
              // Auto-create parent account
              const parent_username = `ortu_${email.split('@')[0]}`;
              const parent_email = `ortu.${email.split('@')[0]}@lms.sch.id`;
              const parent_nik = nis; // Use child NIS directly as NIK

              const newParentDoc = {
                _id: new mongoose.Types.ObjectId(),
                nik: parent_nik,
                full_name: parent_nama,
                email: parent_email,
                username: parent_username,
                password: hashed_ortu_default,
                role: 'ortu',
                children: [student_id_placeholder],
                phone: '',
                profile: { avatar: null, bio: '', address: '' },
                created_at: new Date(),
                updated_at: new Date()
              };

              // Insert parent into the database
              await getCollection('users_ortu').insertOne(newParentDoc);

              // Add to parentMap so other sibling rows in same import match it
              parentMap.push(newParentDoc);
              parent_id = newParentDoc._id;
              parent = newParentDoc;
            }

            // Link the student to parent's children list in database if not already linked
            if (parent) {
              if (!parent.children) {
                parent.children = [];
              }
              if (!parent.children.some(cId => cId.toString() === student_id_placeholder.toString())) {
                parent.children.push(student_id_placeholder);
                await getCollection('users_ortu').updateOne(
                  { _id: parent._id },
                  { $addToSet: { children: student_id_placeholder } }
                );
              }
            }

            student_id = student_id_placeholder;
          } else {
            student_id = new mongoose.Types.ObjectId();
          }

          let username = email.split('@')[0];
          if (studentUsernameSet.has(username)) { username = `${username}${nis.slice(-3)}`; }

          // Add to local sets so subsequent duplicate records in same sheet are identified
          studentNisSet.add(nis);
          studentEmailSet.add(email);
          studentUsernameSet.add(username);

          studentsToInsert.push({
            _id: student_id,
            nis, full_name, email, username, password: hashed_default, role: 'siswa',
            class_id: class_doc._id, parent_id, academic_year_id: year_id,
            status: (status.toLowerCase().trim() === 'inactive' || status.toLowerCase().trim() === 'nonaktif' || status.toLowerCase().trim() === 'non-aktif') ? 'inactive' : 'active',
            profile: { avatar: null, bio: '', phone: '', address: '' }, created_at: new Date(), updated_at: new Date()
          });
          success++;
        } catch (e) { errors.push(`Sheet ${worksheet.name} Baris ${i}: ${e.message}`); }
      }
    }

    if (studentsToInsert.length > 0) {
      await getCollection('users_siswa').insertMany(studentsToInsert);
      try {
        await logActivity(req, 'Import Siswa', `Mengimport ${studentsToInsert.length} data siswa baru dari file Excel.`);
      } catch (logErr) {
        console.error('Failed to log importStudents:', logErr);
      }
    }

    res.json({ message: 'Import siswa selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 20), default_password });
  } catch (error) { res.status(500).json({ error: `Gagal import siswa: ${error.message}` }); }
};


exports.exportTeachers = async (req, res) => {
  try {
    const teachers = await getCollection('users_guru').aggregate([
      { $lookup: { from: 'subjects', localField: 'subjects', foreignField: '_id', as: 'subject_details' } },
      { $lookup: { from: 'classes', localField: 'classes', foreignField: '_id', as: 'class_details' } },
      {
        $project: {
          _id: 0,
          nip: 1,
          full_name: 1,
          teacher_code: { $ifNull: ['$teacher_code', '$username'] },
          subjects: { $map: { input: '$subject_details', as: 's', in: '$$s.name' } },
          phone: 1,
          is_active: 1
        }
      }
    ]).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Guru');
    worksheet.columns = [
      { header: 'NIP', key: 'nip', width: 20 },
      { header: 'Nama Lengkap', key: 'full_name', width: 30 },
      { header: 'Kode Guru', key: 'teacher_code', width: 15 },
      { header: 'Mata Pelajaran', key: 'subjects_formatted', width: 30 },
      { header: 'Telepon', key: 'phone', width: 20 },
      { header: 'Status', key: 'status_formatted', width: 15 }
    ];

    teachers.forEach(t => {
      worksheet.addRow({
        nip: t.nip || '-',
        full_name: t.full_name || '-',
        teacher_code: t.teacher_code || '-',
        subjects_formatted: t.subjects ? t.subjects.join(', ') : '-',
        phone: t.phone || '-',
        status_formatted: t.is_active ? 'Aktif' : 'Nonaktif'
      });
    });

    await sendExcelFile(res, workbook, 'laporan_guru.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export guru: ${error.message}` });
  }
};

exports.importTeachers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    let headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => { headers[cell.value] = colNumber; });
    if (!headers['nip'] || !headers['full_name'] || !headers['email'] || !headers['username']) {
      return res.status(400).json({ error: 'Kolom wajib (nip, full_name, email, username) tidak ditemukan' });
    }

    let success = 0, errors = [];
    const default_password = "guru123";
    const hashed_default = await bcrypt.hash(default_password, 10);
    const all_subjects = await getCollection('subjects').find({}).toArray();
    const subjectMap = {};
    all_subjects.forEach(s => subjectMap[s.name.trim().toLowerCase()] = s._id);

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.values.length) continue;

      try {
        const nip = row.getCell(headers['nip']).text?.trim();
        const full_name = row.getCell(headers['full_name']).text?.trim();
        const email = row.getCell(headers['email']).text?.trim()?.toLowerCase();
        const username = row.getCell(headers['username']).text?.trim();
        const teacher_code = headers['teacher_code'] ? row.getCell(headers['teacher_code']).text?.trim() : username;
        const subjects_str = headers['subjects'] ? row.getCell(headers['subjects']).text?.trim() : '';
        const classes_str = headers['classes'] ? row.getCell(headers['classes']).text?.trim() : '';
        const phone = headers['phone'] ? row.getCell(headers['phone']).text?.trim() : '';

        if (!nip || !full_name || !email || !username) continue;
        if (await getCollection('users_guru').findOne({ nip })) { errors.push(`Baris ${i}: NIP ${nip} sudah ada`); continue; }
        if (await getCollection('users_guru').findOne({ email })) { errors.push(`Baris ${i}: Email ${email} sudah ada`); continue; }

        let subject_ids = [];
        if (subjects_str) {
          const sNames = subjects_str.split(',').map(s => s.trim()).filter(Boolean);
          for (let sn of sNames) {
            let key = sn.toLowerCase();
            if (subjectMap[key]) subject_ids.push(subjectMap[key]); else errors.push(`Baris ${i}: Mapel '${sn}' tidak ditemukan`);
          }
        }

        let class_ids = [];
        if (classes_str) {
          const cNames = classes_str.split(',').map(c => c.trim()).filter(Boolean);
          for (let cn of cNames) {
            const cls = await getCollection('classes').findOne({ name: cn });
            if (cls) class_ids.push(cls._id); else errors.push(`Baris ${i}: Kelas '${cn}' tidak ditemukan`);
          }
        }

        await getCollection('users_guru').insertOne({
          nip, full_name, email, username, teacher_code, password: hashed_default, role: 'guru',
          subjects: subject_ids, classes: class_ids, phone, is_active: true,
          profile: { avatar: null, bio: '', address: '' }, created_at: new Date(), updated_at: new Date()
        });
        success++;
      } catch (e) { errors.push(`Baris ${i}: ${e.message}`); }
    }
    if (success > 0) {
      try {
        await logActivity(req, 'Import Guru', `Mengimport ${success} data guru baru dari file Excel.`);
      } catch (logErr) {
        console.error('Failed to log importTeachers:', logErr);
      }
    }
    res.json({ message: 'Import guru selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 10), default_password });
  } catch (error) { res.status(500).json({ error: `Gagal import guru: ${error.message}` }); }
};

exports.exportAcademicYears = async (req, res) => {
  try {
    const years = await getCollection('academic_years').find({}).toArray();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('TahunAjaran');
    worksheet.columns = [
      { header: 'name', key: 'name', width: 20 }, { header: 'semester', key: 'semester', width: 15 },
      { header: 'is_active', key: 'is_active', width: 15 }, { header: 'start_date', key: 'start_date', width: 20 },
      { header: 'end_date', key: 'end_date', width: 20 }
    ];
    years.forEach(y => {
      y.name = y.year || y.name || '';
      if (y.start_date) y.start_date = y.start_date.toISOString().split('T')[0];
      if (y.end_date) y.end_date = y.end_date.toISOString().split('T')[0];
      worksheet.addRow(y);
    });
    await sendExcelFile(res, workbook, 'tahun_ajaran.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal export tahun ajaran: ${error.message}` }); }
};

exports.importAcademicYears = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    let headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[String(cell.value).trim().toLowerCase()] = colNumber;
      }
    });
    const nameKey = headers['name'] || headers['year'];
    if (!nameKey) return res.status(400).json({ error: 'Kolom "name" atau "year" tidak ditemukan' });

    let success = 0, errors = [];

    let has_active = false;
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const val = row.getCell(headers['is_active'])?.text?.trim()?.toLowerCase();
      if (val === 'true' || val === '1' || val === 'yes' || val === 'active') { has_active = true; break; }
    }
    if (has_active) await getCollection('academic_years').updateMany({}, { $set: { is_active: false } });

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.values.length) continue;

      try {
        const name = row.getCell(nameKey).text?.trim();
        if (!name) { errors.push(`Baris ${i}: Nama kosong`); continue; }
        if (await getCollection('academic_years').findOne({ $or: [{ year: name }, { name: name }] })) {
          errors.push(`Baris ${i}: '${name}' sudah ada`);
          continue;
        }

        const semester = headers['semester'] ? row.getCell(headers['semester']).text?.trim() : '';
        const is_active_raw = headers['is_active'] ? row.getCell(headers['is_active']).text?.trim()?.toLowerCase() : 'false';
        const is_active = ['true', '1', 'yes', 'active'].includes(is_active_raw);

        let start_date = null, end_date = null;
        if (headers['start_date']) start_date = new Date(row.getCell(headers['start_date']).value);
        if (headers['end_date']) end_date = new Date(row.getCell(headers['end_date']).value);

        await getCollection('academic_years').insertOne({
          year: name, name, semester, is_active, start_date, end_date, created_at: new Date(), updated_at: new Date()
        });
        success++;
      } catch (e) { errors.push(`Baris ${i}: ${e.message}`); }
    }
    res.json({ message: 'Import tahun ajaran selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 10) });
  } catch (error) { res.status(500).json({ error: `Gagal import tahun ajaran: ${error.message}` }); }
};

exports.exportParents = async (req, res) => {
  try {
    const parents = await getCollection('users_ortu').aggregate([
      { $lookup: { from: 'users_siswa', localField: 'children', foreignField: '_id', as: 'anak' } },
      { $project: { _id: 0, nik: 1, full_name: 1, email: 1, username: 1, phone: 1, anak_nama: { $map: { input: '$anak', as: 'a', in: '$$a.full_name' } } } }
    ]).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OrangTua');
    worksheet.columns = [
      { header: 'nik', key: 'nik', width: 20 }, { header: 'full_name', key: 'full_name', width: 30 },
      { header: 'email', key: 'email', width: 30 }, { header: 'username', key: 'username', width: 20 },
      { header: 'phone', key: 'phone', width: 20 }, { header: 'anak', key: 'anak', width: 40 }
    ];
    parents.forEach(p => {
      p.anak = p.anak_nama ? p.anak_nama.join(', ') : '';
      worksheet.addRow(p);
    });
    await sendExcelFile(res, workbook, 'orang_tua.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal export orang tua: ${error.message}` }); }
};

exports.importParents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    let headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[String(cell.value).trim().toLowerCase()] = colNumber;
      }
    });
    if (!headers['nik'] || !headers['full_name'] || !headers['email'] || !headers['username']) {
      return res.status(400).json({ error: 'Kolom wajib (nik, full_name, email, username) tidak ditemukan' });
    }

    let success = 0, errors = [];
    const default_password = "ortu123";
    const hashed_default = await bcrypt.hash(default_password, 10);

    // Fetch existing parents in-memory to prevent loop queries
    const existingParents = await getCollection('users_ortu')
      .find({})
      .toArray();

    const parentNikSet = new Set(existingParents.map(p => p.nik?.trim()));
    const parentEmailSet = new Set(existingParents.map(p => p.email?.trim()?.toLowerCase()));

    // Fetch all students in-memory to map child NIS lists instantly
    const existingStudents = await getCollection('users_siswa')
      .find({})
      .toArray();
    const studentNisMap = Object.fromEntries(existingStudents.map(s => [s.nis?.trim(), s._id]));

    const parentsToInsert = [];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.values.length) continue;

      try {
        const getVal = (colKey) => {
          const colNum = headers[colKey];
          if (!colNum) return '';
          const cell = row.getCell(colNum);
          if (!cell || cell.value === null || cell.value === undefined) return '';
          if (typeof cell.value === 'object') {
            if (cell.value.text !== undefined) return String(cell.value.text).trim();
            if (cell.value.result !== undefined) return String(cell.value.result).trim();
            if (cell.value.hyperlink !== undefined) return String(cell.value.hyperlink).replace(/^mailto:/i, '').trim();
          }
          return String(cell.value).trim();
        };

        const nik = getVal('nik');
        const full_name = getVal('full_name');
        const email = getVal('email').toLowerCase();
        const username = getVal('username');
        const phone = getVal('phone');
        const anak_nis_list = getVal('anak');

        if (!nik || !full_name || !email || !username) continue;

        if (parentNikSet.has(nik)) { errors.push(`Baris ${i}: NIK ${nik} sudah ada`); continue; }
        if (parentEmailSet.has(email)) { errors.push(`Baris ${i}: Email ${email} sudah ada`); continue; }

        let anak_ids = [];
        if (anak_nis_list) {
          const nis_list = anak_nis_list.split(',').map(n => n.trim()).filter(Boolean);
          for (let anis of nis_list) {
            const studentId = studentNisMap[anis];
            if (studentId) {
              anak_ids.push(studentId);
            } else {
              errors.push(`Baris ${i}: Siswa NIS '${anis}' tidak ditemukan`);
            }
          }
        }

        // Add to local sets to prevent duplicate checks within same sheet
        parentNikSet.add(nik);
        parentEmailSet.add(email);

        parentsToInsert.push({
          nik, full_name, email, username, password: hashed_default, role: 'ortu', children: anak_ids, phone,
          profile: { avatar: null, bio: '', address: '' }, created_at: new Date(), updated_at: new Date()
        });
        success++;
      } catch (e) { errors.push(`Baris ${i}: ${e.message}`); }
    }

    if (parentsToInsert.length > 0) {
      await getCollection('users_ortu').insertMany(parentsToInsert);
    }

    res.json({ message: 'Import orang tua selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 10), default_password });
  } catch (error) { res.status(500).json({ error: `Gagal import orang tua: ${error.message}` }); }
};

exports.exportSubjects = async (req, res) => {
  try {
    const subjects = await getCollection('subjects').find({}, { projection: { _id: 0, name: 1, code: 1, description: 1, is_active: 1 } }).toArray();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('MataPelajaran');
    worksheet.columns = [
      { header: 'name', key: 'name', width: 25 }, { header: 'code', key: 'code', width: 15 },
      { header: 'description', key: 'description', width: 40 }, { header: 'is_active', key: 'is_active', width: 15 }
    ];
    subjects.forEach(s => worksheet.addRow(s));
    await sendExcelFile(res, workbook, 'mata_pelajaran.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal export mapel: ${error.message}` }); }
};

exports.importSubjects = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    let headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => { headers[cell.value] = colNumber; });
    if (!headers['name']) return res.status(400).json({ error: 'Kolom "name" tidak ditemukan' });

    let success = 0, errors = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.values.length) continue;

      try {
        const name = row.getCell(headers['name']).text?.trim();
        if (!name) { errors.push(`Baris ${i}: Nama kosong`); continue; }
        if (await getCollection('subjects').findOne({ name })) { errors.push(`Baris ${i}: Mapel '${name}' sudah ada`); continue; }

        const code = headers['code'] ? row.getCell(headers['code']).text?.trim() : '';
        const description = headers['description'] ? row.getCell(headers['description']).text?.trim() : '';
        let is_active = true;
        if (headers['is_active']) {
          const v = row.getCell(headers['is_active']).text?.trim()?.toLowerCase();
          is_active = ['true', '1', 'yes', 'active'].includes(v);
        }

        await getCollection('subjects').insertOne({
          name, code, description, is_active, created_at: new Date(), updated_at: new Date()
        });
        success++;
      } catch (e) { errors.push(`Baris ${i}: ${e.message}`); }
    }
    res.json({ message: 'Import mapel selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 10) });
  } catch (error) { res.status(500).json({ error: `Gagal import mapel: ${error.message}` }); }
};

exports.exportStudentsTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template_Siswa');
    worksheet.columns = [
      { header: 'email', key: 'email', width: 30 },
      { header: 'nis', key: 'nis', width: 15 },
      { header: 'full_name', key: 'full_name', width: 30 },
      { header: 'class_name', key: 'class_name', width: 15 },
      { header: 'status', key: 'status', width: 15 },
      { header: 'academic_year', key: 'academic_year', width: 15 },
      { header: 'orang_tua_nama', key: 'orang_tua_nama', width: 30 }
    ];
    await sendExcelFile(res, workbook, 'template_siswa.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal membuat template: ${error.message}` }); }
};


exports.exportParentsTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template_OrangTua');
    worksheet.columns = [
      { header: 'nik', key: 'nik', width: 20 },
      { header: 'full_name', key: 'full_name', width: 30 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'username', key: 'username', width: 20 },
      { header: 'phone', key: 'phone', width: 20 },
      { header: 'anak', key: 'anak', width: 40 }
    ];
    await sendExcelFile(res, workbook, 'template_orang_tua.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal membuat template: ${error.message}` }); }
};

exports.exportTeachersTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template_Guru');
    worksheet.columns = [
      { header: 'nip', key: 'nip', width: 20 },
      { header: 'full_name', key: 'full_name', width: 30 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'username', key: 'username', width: 20 },
      { header: 'teacher_code', key: 'teacher_code', width: 15 },
      { header: 'subjects', key: 'subjects', width: 30 },
      { header: 'classes', key: 'classes', width: 30 },
      { header: 'phone', key: 'phone', width: 20 }
    ];
    await sendExcelFile(res, workbook, 'template_guru.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal membuat template: ${error.message}` }); }
};

exports.exportSchedulesTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template_Jadwal');
    worksheet.columns = [
      { header: 'HARI', key: 'hari', width: 15 },
      { header: 'JAM_KE', key: 'jam_ke', width: 10 },
      { header: 'WAKTU_MULAI', key: 'waktu_mulai', width: 15 },
      { header: 'WAKTU_SELESAI', key: 'waktu_selesai', width: 15 },
      { header: 'KELAS', key: 'kelas', width: 15 },
      { header: 'MATA_PELAJARAN', key: 'mata_pelajaran', width: 25 },
      { header: 'GURU', key: 'guru', width: 30 },
      { header: 'RUANG', key: 'ruang', width: 15 }
    ];
    // Contoh baris
    worksheet.addRow({
      hari: 'SENIN',
      jam_ke: 1,
      waktu_mulai: '07:20',
      waktu_selesai: '08:00',
      kelas: '7A',
      mata_pelajaran: 'Matematika',
      guru: 'Budi Utomo, S.Pd',
      ruang: '7A'
    });
    await sendExcelFile(res, workbook, 'template_jadwal.xlsx');
  } catch (error) { 
    res.status(500).json({ error: `Gagal membuat template: ${error.message}` }); 
  }
};

exports.importSchedules = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    
    const activeYear = await getCollection('academic_years').findOne({ is_active: true });
    if (!activeYear) {
      return res.status(400).json({ error: 'Tidak ada tahun ajaran aktif. Silakan aktifkan tahun ajaran terlebih dahulu.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    // Find the worksheet containing schedule data
    let worksheet = workbook.getWorksheet(1);
    for (const ws of workbook.worksheets) {
      const sheetNameUpper = ws.name.toUpperCase();
      if (sheetNameUpper.includes('JADWAL') || sheetNameUpper.includes('KBM') || sheetNameUpper.includes('GENAP') || sheetNameUpper.includes('GANJIL')) {
        worksheet = ws;
        break;
      }
    }
    
    const classes = await getCollection('classes').find({}).toArray();
    const subjects = await getCollection('subjects').find({}).toArray();
    const teachers = await getCollection('users_guru').find({}).toArray();

    const normalize = str => str ? str.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    
    // DETEKSI FORMAT: Apakah Grid Sekolah (seperti screenshot) atau Template Kita?
    let isGridFormat = false;
    let gridHeaderRow = 6;
    
    for (let r = 1; r <= 15; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 30; c++) {
        const val = (row.getCell(c).text || row.getCell(c).value?.toString() || '').toUpperCase().trim();
        if (val && (val.includes('KELAS VII') || val.includes('KELAS VIII') || val.includes('KELAS IX') || val.includes('SEMESTER'))) {
          isGridFormat = true;
          gridHeaderRow = r;
          break;
        }
      }
      if (isGridFormat) break;
    }

    let success = 0, errors = [];
    const schedulesToInsert = [];
    const validDays = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

    if (isGridFormat) {
      // -------------------------------------------------------------
      // FORMAT GRID SEKOLAH (Deteksi Kolom Dinamis)
      // -------------------------------------------------------------
      const colToClassMap = {};
      let currentGrade = '';
      
      const gradeRow = worksheet.getRow(gridHeaderRow);
      const classRow = worksheet.getRow(gridHeaderRow + 1);

      // Pindai dari kolom 1 ke kolom 50
      for (let col = 1; col <= 50; col++) {
        let gradeVal = gradeRow.getCell(col).text || gradeRow.getCell(col).value?.toString() || '';
        if (typeof gradeVal === 'object') gradeVal = gradeVal.result || gradeVal.text || '';
        gradeVal = gradeVal.toUpperCase().trim();

        if (gradeVal) {
          if (gradeVal.includes('VIII') || gradeVal.includes('8')) {
            currentGrade = '8';
          } else if (gradeVal.includes('VII') || gradeVal.includes('7')) {
            currentGrade = '7';
          } else if (gradeVal.includes('IX') || gradeVal.includes('9')) {
            currentGrade = '9';
          }
        }

        let classCellText = classRow.getCell(col).text || classRow.getCell(col).value?.toString() || '';
        if (typeof classCellText === 'object') classCellText = classCellText.result || classCellText.text || '';
        classCellText = classCellText.toUpperCase().trim();

        if (classCellText) {
          let className = classCellText;
          if (/^[A-Z]$/.test(classCellText) && currentGrade) {
            className = `${currentGrade}${classCellText}`;
          }
          const foundClass = classes.find(c => normalize(c.name) === normalize(className) || normalize(c.name) === normalize(classCellText));
          if (foundClass) {
            colToClassMap[col] = foundClass._id;
          }
        }
      }

      let currentDay = '';

      for (let r = gridHeaderRow + 2; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        
        // Kolom 1 (A) atau Kolom 2 (B) untuk Hari (bisa jadi merged/kosong)
        let dayVal = row.getCell(1).text || row.getCell(1).value?.toString() || row.getCell(2).text || '';
        if (typeof dayVal === 'object') dayVal = dayVal.result || dayVal.text || '';
        dayVal = dayVal.toUpperCase().trim();

        const matchedDay = validDays.find(d => dayVal.includes(d));
        if (matchedDay) {
          currentDay = matchedDay;
        }

        if (!currentDay) continue;

        // Kolom 2 (B) adalah Jam Ke (period), Kolom 3 (C) adalah Waktu
        let periodVal = row.getCell(2).text || row.getCell(2).value?.toString() || '';
        let timeVal = row.getCell(3).text || row.getCell(3).value?.toString() || '';
        if (typeof timeVal === 'object') timeVal = timeVal.result || timeVal.text || '';

        if (!timeVal) continue;

        const cleanTimeVal = timeVal.toString().toUpperCase();
        if (cleanTimeVal.includes('ISTIRAHAT') || cleanTimeVal.includes('TADARUS') || cleanTimeVal.includes('UPACARA') || cleanTimeVal.includes('SHOLAT')) {
          continue;
        }

        const timeParts = timeVal.toString().split(/[-–]/).map(t => t.trim().replace('.', ':'));
        if (timeParts.length < 2) continue;
        const startTime = timeParts[0];
        const endTime = timeParts[1];
        const timeSlotNum = Number(periodVal) || 1;

        for (const [colIndex, classId] of Object.entries(colToClassMap)) {
          let codeVal = row.getCell(Number(colIndex)).text || row.getCell(Number(colIndex)).value?.toString() || '';
          if (typeof codeVal === 'object') codeVal = codeVal.result || codeVal.text || '';
          codeVal = codeVal.trim();

          if (!codeVal || codeVal === '-' || codeVal === '/' || codeVal === '.') {
            continue;
          }

          const cleanCode = codeVal.toUpperCase();
          if (cleanCode.includes('ISTIRAHAT') || cleanCode.includes('UPACARA') || cleanCode.includes('TADARUS') || cleanCode.includes('SHOLAT') || cleanCode.includes('BERSIH') || cleanCode.includes('SEHAT')) {
            continue;
          }

          const foundTeacher = teachers.find(t => t.teacher_code && t.teacher_code.toString().toLowerCase().trim() === codeVal.toLowerCase());
          if (!foundTeacher) {
            errors.push(`Baris ${r}: Guru dengan kode '${codeVal}' tidak ditemukan`);
            continue;
          }

          let subjectId = (foundTeacher.subjects && foundTeacher.subjects[0]) || foundTeacher.subject_id || foundTeacher.subject;
          if (!subjectId && subjects.length > 0) {
            subjectId = subjects[0]._id;
          }

          if (!subjectId) {
            errors.push(`Baris ${r}: Guru '${foundTeacher.full_name}' tidak memiliki bidang studi`);
            continue;
          }

          schedulesToInsert.push({
            academic_year_id: activeYear._id,
            class_id: classId,
            subject_id: subjectId,
            teacher_id: foundTeacher._id,
            day: currentDay,
            time_slot: timeSlotNum,
            start_time: startTime,
            end_time: endTime,
            room: '',
            generated_type: 'manual',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });

          success++;
        }
      }

    } else {
      // -------------------------------------------------------------
      // FORMAT TEMPLATE KITA
      // -------------------------------------------------------------
      let headers = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => { 
        if (cell.value) headers[cell.value.toString().toLowerCase().trim()] = colNumber; 
      });

      const requiredHeaders = ['hari', 'jam_ke', 'waktu_mulai', 'waktu_selesai', 'kelas', 'mata_pelajaran', 'guru'];
      for (const h of requiredHeaders) {
        if (!headers[h]) {
          return res.status(400).json({ error: `Kolom wajib "${h}" tidak ditemukan di file Excel` });
        }
      }

      const findClass = (name) => {
        const normName = normalize(name);
        return classes.find(c => normalize(c.name) === normName);
      };
      
      const findSubject = (name) => {
        const normName = normalize(name);
        return subjects.find(s => normalize(s.name) === normName);
      };
      
      const findTeacher = (name) => {
        const normName = normalize(name);
        return teachers.find(t => normalize(t.full_name) === normName || normalize(t.username) === normName || (t.nip && normalize(t.nip) === normName));
      };

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row.values || row.values.length === 0) continue;

        try {
          const hari = row.getCell(headers['hari']).text?.trim()?.toUpperCase();
          const jamKe = row.getCell(headers['jam_ke']).value;
          const waktuMulai = row.getCell(headers['waktu_mulai']).text?.trim();
          const waktuSelesai = row.getCell(headers['waktu_selesai']).text?.trim();
          const kelasName = row.getCell(headers['kelas']).text?.trim();
          const mapelName = row.getCell(headers['mata_pelajaran']).text?.trim();
          const guruName = row.getCell(headers['guru']).text?.trim();
          const ruang = headers['ruang'] ? row.getCell(headers['ruang']).text?.trim() : '';

          if (!hari || !jamKe || !waktuMulai || !waktuSelesai || !kelasName || !mapelName || !guruName) {
            errors.push(`Baris ${i}: Kolom wajib ada yang kosong`);
            continue;
          }

          if (!validDays.includes(hari)) {
            errors.push(`Baris ${i}: Hari '${hari}' tidak valid. Pilihan: ${validDays.join(', ')}`);
            continue;
          }

          const foundClass = findClass(kelasName);
          if (!foundClass) {
            errors.push(`Baris ${i}: Kelas '${kelasName}' tidak ditemukan`);
            continue;
          }

          const foundSubject = findSubject(mapelName);
          if (!foundSubject) {
            errors.push(`Baris ${i}: Mata Pelajaran '${mapelName}' tidak ditemukan`);
            continue;
          }

          const foundTeacher = findTeacher(guruName);
          if (!foundTeacher) {
            errors.push(`Baris ${i}: Guru '${guruName}' tidak ditemukan`);
            continue;
          }

          schedulesToInsert.push({
            academic_year_id: activeYear._id,
            class_id: foundClass._id,
            subject_id: foundSubject._id,
            teacher_id: foundTeacher._id,
            day: hari,
            time_slot: Number(jamKe) || 1,
            start_time: waktuMulai,
            end_time: waktuSelesai,
            room: ruang || '',
            generated_type: 'manual',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });

          success++;
        } catch (e) {
          errors.push(`Baris ${i}: ${e.message}`);
        }
      }
    }

    if (schedulesToInsert.length > 0) {
      await getCollection('schedules').deleteMany({ academic_year_id: activeYear._id });
      await getCollection('schedules').insertMany(schedulesToInsert);

      // Auto-sync teachers' assigned classes and subjects
      const scheduleService = require('../services/scheduleService');
      await scheduleService.syncAllTeachers();

      try {
        await logActivity(req, 'Import Jadwal', `Mengimport ${schedulesToInsert.length} jadwal pelajaran dari file Excel.`);
      } catch (logErr) {
        console.error('Failed to log importSchedules:', logErr);
      }
    }

    res.json({ 
      message: 'Import jadwal pelajaran selesai', 
      success_count: success, 
      error_count: errors.length, 
      errors: errors.slice(0, 15) 
    });
  } catch (error) {
    res.status(500).json({ error: `Gagal import jadwal: ${error.message}` });
  }
};

exports.exportSchedules = async (req, res) => {
  try {
    const schedules = await getCollection('schedules').aggregate([
      { $lookup: { from: 'classes', localField: 'class_id', foreignField: '_id', as: 'kelas' } },
      { $lookup: { from: 'subjects', localField: 'subject_id', foreignField: '_id', as: 'mapel' } },
      { $lookup: { from: 'users_guru', localField: 'teacher_id', foreignField: '_id', as: 'guru' } },
      {
        $project: {
          _id: 0,
          day: 1,
          time_slot: 1,
          start_time: 1,
          end_time: 1,
          class_name: { $arrayElemAt: ['$kelas.name', 0] },
          subject_name: { $arrayElemAt: ['$mapel.name', 0] },
          teacher_name: { $arrayElemAt: ['$guru.full_name', 0] },
          room: 1
        }
      }
    ]).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Jadwal Pelajaran');
    worksheet.columns = [
      { header: 'Hari', key: 'day', width: 15 },
      { header: 'Jam Ke', key: 'time_slot', width: 10 },
      { header: 'Waktu Mulai', key: 'start_time', width: 15 },
      { header: 'Waktu Selesai', key: 'end_time', width: 15 },
      { header: 'Kelas', key: 'class_name', width: 15 },
      { header: 'Mata Pelajaran', key: 'subject_name', width: 25 },
      { header: 'Guru Pengajar', key: 'teacher_name', width: 30 },
      { header: 'Ruangan', key: 'room', width: 15 }
    ];
    schedules.forEach(s => worksheet.addRow(s));
    await sendExcelFile(res, workbook, 'jadwal_pelajaran.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export jadwal: ${error.message}` });
  }
};

exports.exportActivities = async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const logs = await ActivityLog.find().sort({ created_at: -1 }).limit(500);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Aktivitas Pengguna');
    worksheet.columns = [
      { header: 'Waktu', key: 'time_formatted', width: 25 },
      { header: 'Pengguna', key: 'user', width: 20 },
      { header: 'Aktivitas', key: 'action', width: 25 },
      { header: 'Detail', key: 'detail', width: 45 }
    ];

    logs.forEach(l => {
      const date = new Date(l.created_at);
      const time_formatted = date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      worksheet.addRow({
        time_formatted,
        user: l.user_name || 'System',
        action: l.action,
        detail: l.detail
      });
    });

    await sendExcelFile(res, workbook, 'aktivitas_pengguna.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export aktivitas: ${error.message}` });
  }
};
