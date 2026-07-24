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
    const worksheet = workbook.addWorksheet('A4 Januari 2026');

    // Setup column widths
    const colWidths = [12, 6, 14]; // HARI, JAM KE, WAKTU
    for (let i = 0; i < 29; i++) colWidths.push(5); // 7A-7J, 8A-8J, 9A-9I
    colWidths.push(8); // PIKET

    worksheet.columns = colWidths.map((w) => ({ width: w }));

    // Styles
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    const grade7Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    const grade8Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    const grade9Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFE6FF' } };

    // Row 1 - 5: Title Headers
    worksheet.mergeCells('A1:AG1');
    worksheet.getCell('A1').value = 'JADWAL PELAJARAN';
    worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:AG2');
    worksheet.getCell('A2').value = 'SEMESTER GENAP';
    worksheet.getCell('A2').font = { bold: true, size: 12, name: 'Times New Roman' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:AG3');
    worksheet.getCell('A3').value = 'SMP NEGERI 1 SURADADI';
    worksheet.getCell('A3').font = { bold: true, size: 12, name: 'Times New Roman' };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A4:AG4');
    worksheet.getCell('A4').value = 'TAHUN PELAJARAN 2025/2026';
    worksheet.getCell('A4').font = { bold: true, size: 11, name: 'Times New Roman' };
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A5:AG5');
    worksheet.getCell('A5').value = 'BERLAKU MULAI 31 MARET 2026';
    worksheet.getCell('A5').font = { italic: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('A5').alignment = { horizontal: 'center' };

    // Row 6: Grade Headers
    worksheet.mergeCells('A6:A7');
    worksheet.getCell('A6').value = 'HARI';

    worksheet.mergeCells('B6:B7');
    worksheet.getCell('B6').value = 'JK';

    worksheet.mergeCells('C6:C7');
    worksheet.getCell('C6').value = 'WAKTU';

    worksheet.mergeCells('D6:M6');
    worksheet.getCell('D6').value = 'KELAS VII';

    worksheet.mergeCells('N6:W6');
    worksheet.getCell('N6').value = 'KELAS VIII';

    worksheet.mergeCells('X6:AF6');
    worksheet.getCell('X6').value = 'KELAS IX';

    worksheet.mergeCells('AG6:AG7');
    worksheet.getCell('AG6').value = 'PIKET';

    // Format Row 6 Grade Cells
    ['A6', 'B6', 'C6', 'AG6'].forEach((ref) => {
      const cell = worksheet.getCell(ref);
      cell.font = { bold: true, size: 10, name: 'Times New Roman' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = headerFill;
    });

    const g7Cell = worksheet.getCell('D6');
    g7Cell.font = { bold: true, size: 11, name: 'Times New Roman' };
    g7Cell.alignment = { horizontal: 'center', vertical: 'middle' };
    g7Cell.fill = grade7Fill;

    const g8Cell = worksheet.getCell('N6');
    g8Cell.font = { bold: true, size: 11, name: 'Times New Roman' };
    g8Cell.alignment = { horizontal: 'center', vertical: 'middle' };
    g8Cell.fill = grade8Fill;

    const g9Cell = worksheet.getCell('X6');
    g9Cell.font = { bold: true, size: 11, name: 'Times New Roman' };
    g9Cell.alignment = { horizontal: 'center', vertical: 'middle' };
    g9Cell.fill = grade9Fill;

    // Row 7: Class Letter Subheaders (D7..AF7)
    const grade7Letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const grade8Letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const grade9Letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    grade7Letters.forEach((letter, idx) => {
      const colNum = 4 + idx;
      const cell = worksheet.getRow(7).getCell(colNum);
      cell.value = letter;
      cell.font = { bold: true, size: 9, name: 'Times New Roman' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = grade7Fill;
    });

    grade8Letters.forEach((letter, idx) => {
      const colNum = 14 + idx;
      const cell = worksheet.getRow(7).getCell(colNum);
      cell.value = letter;
      cell.font = { bold: true, size: 9, name: 'Times New Roman' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = grade8Fill;
    });

    grade9Letters.forEach((letter, idx) => {
      const colNum = 24 + idx;
      const cell = worksheet.getRow(7).getCell(colNum);
      cell.value = letter;
      cell.font = { bold: true, size: 9, name: 'Times New Roman' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = grade9Fill;
    });

    // Schedule Template Sample Data Rows
    const scheduleRows = [
      // SENIN
      { day: 'SENIN', jk: '1', time: '07.00-08.00', isSpecial: true, specialText: 'U P A C A R A   B E N D E R A' },
      { day: 'SENIN', jk: '2', time: '08.00-08.40', codes: ['Oo', 'C', 'E', 'Gg', 'Ww', 'Ss', 'Pp', 'S', 'Aa', 'Uu', 'I', 'O', 'P', 'K', 'L', 'Z', 'T', 'X', 'Ii', 'Jj', 'J', 'N', 'Y', 'F', 'U', 'Xx', 'Hh', 'Ff', 'Tt'], piket: 'C' },
      { day: 'SENIN', jk: '3', time: '08.40-09.20', codes: ['Oo', 'C', 'E', 'Gg', 'Ww', 'Ss', 'Pp', 'S', 'Aa', 'Uu', 'I', 'O', 'P', 'K', 'L', 'Z', 'T', 'X', 'M', 'Jj', 'J', 'N', 'Y', 'F', 'U', 'Xx', 'Hh', 'Ff', 'Qq'], piket: 'H' },
      { day: 'SENIN', jk: '', time: '09.20-09.40', isSpecial: true, specialText: 'I S T I R A H A T', piket: 'I' },
      { day: 'SENIN', jk: '4', time: '09.40-10.20', codes: ['C', 'Oo', 'Vv', 'Xx', 'Ww', 'S', 'Ss', 'V', 'Pp', 'Uu', 'P', 'I', 'Q', 'K', 'Z', 'Gg', 'L', 'X', 'M', 'Ii', 'Y', 'J', 'Tt', 'F', 'B', 'U', 'Qq', 'Ff', 'W'], piket: 'Aa' },
      { day: 'SENIN', jk: '5', time: '10.20-11.00', codes: ['C', 'Oo', 'Vv', 'Xx', 'H', 'S', 'Ss', 'V', 'Pp', 'Ii', 'P', 'I', 'Q', 'D', 'Z', 'Gg', 'L', 'T', 'X', 'Aa', 'Y', 'J', 'F', 'Hh', 'B', 'U', 'Mm', 'O', 'W'], piket: 'Bb' },
      { day: 'SENIN', jk: '6', time: '11.00-11.40', codes: ['Vv', 'Oo', 'C', 'Ww', 'H', 'Rr', 'Ss', 'W', 'Uu', 'Ii', 'Q', 'N', 'R', 'D', 'K', 'Gg', 'Z', 'T', 'X', 'Aa', 'Jj', 'J', 'F', 'Hh', 'Qq', 'Tt', 'Mm', 'O', 'Ff'], piket: 'Uu' },
      { day: 'SENIN', jk: '', time: '11.40-12.10', isSpecial: true, specialText: 'I S T I R A H A T   /   S H O L A T   D H U H U R' },
      { day: 'SENIN', jk: '7', time: '12.10-12.50', codes: ['H', 'Pp', 'C', 'Ww', 'E', 'Vv', 'V', 'W', 'Uu', 'S', 'Q', 'D', 'R', 'P', 'K', 'Ii', 'Z', 'L', 'X', 'Rr', 'Jj', 'G', 'F', 'B', 'Hh', 'Tt', 'U', 'Xx', 'Ff'] },
      { day: 'SENIN', jk: '8', time: '12.50-13.30', codes: ['H', 'Pp', 'Oo', 'Ww', 'E', 'Vv', 'V', 'W', 'Uu', 'S', 'X', 'D', 'R', 'P', 'K', 'Ii', 'Z', 'L', 'Qq', 'Rr', 'Jj', 'G', 'J', 'B', 'Hh', 'Tt', 'U', 'Xx', 'Ff'] },

      // SELASA
      { day: 'SELASA', jk: '', time: '07.00-07.20', isSpecial: true, specialText: 'T A D A R U S   A L Q U R \' A N' },
      { day: 'SELASA', jk: '1', time: '07.20-08.00', codes: ['Mm', 'Vv', 'Oo', 'C', 'Gg', 'Rr', 'S', 'Ss', 'Ww', 'Ii', 'R', 'Q', 'Z', 'O', 'I', 'L', 'K', 'T', 'Qq', 'X', 'G', 'Y', 'J', 'Hh', 'U', 'Ff', 'V', 'W', 'Xx'], piket: 'K' },
      { day: 'SELASA', jk: '2', time: '08.00-08.40', codes: ['Mm', 'Vv', 'Oo', 'C', 'Gg', 'Rr', 'S', 'Ss', 'Ww', 'Ii', 'R', 'Q', 'Z', 'O', 'P', 'L', 'K', 'T', 'Qq', 'X', 'G', 'Y', 'J', 'Hh', 'U', 'Ff', 'V', 'W', 'Xx'], piket: 'L' },
      { day: 'SELASA', jk: '3', time: '08.40-09.20', codes: ['Mm', 'Pp', 'H', 'Oo', 'C', 'Gg', 'Xx', 'Ww', 'Ss', 'Aa', 'N', 'Z', 'O', 'I', 'P', 'Ii', 'K', 'M', 'T', 'X', 'F', 'G', 'B', 'J', 'Y', 'Ff', 'V', 'Tt', 'Hh'], piket: 'M' },
      { day: 'SELASA', jk: '', time: '09.20-09.40', isSpecial: true, specialText: 'I S T I R A H A T', piket: 'W' },
      { day: 'SELASA', jk: '4', time: '09.40-10.20', codes: ['Vv', 'Mm', 'H', 'Oo', 'C', 'Gg', 'Xx', 'V', 'Ss', 'Aa', 'N', 'Z', 'O', 'I', 'R', 'P', 'Qq', 'M', 'T', 'Jj', 'F', 'G', 'B', 'J', 'Y', 'U', 'Ff', 'Tt', 'Hh'], piket: 'Ff' },
      { day: 'SELASA', jk: '5', time: '10.20-11.00', codes: ['Vv', 'Mm', 'E', 'Oo', 'H', 'S', 'V', 'T', 'Ss', 'Ww', 'N', 'R', 'I', 'D', 'L', 'P', 'Aa', 'Qq', 'Rr', 'Jj', 'B', 'F', 'Q', 'Tt', 'M', 'U', 'Ff', 'Hh', 'W'], piket: 'Gg' },
      { day: 'SELASA', jk: '6', time: '11.00-11.40', codes: ['Vv', 'Mm', 'E', 'Gg', 'H', 'S', 'Ww', 'T', 'W', 'Pp', 'X', 'R', 'I', 'D', 'L', 'K', 'Aa', 'Qq', 'Rr', 'Jj', 'B', 'F', 'Q', 'Tt', 'M', 'Y', 'Ff', 'Hh', 'V'], piket: 'W' },
      { day: 'SELASA', jk: '', time: '11.40-12.10', isSpecial: true, specialText: 'I S T I R A H A T   /   S H O L A T   D H U H U R' },
      { day: 'SELASA', jk: '7', time: '12.10-12.50', codes: ['E', 'Xx', 'Vv', 'H', 'Rr', 'Ss', 'Ww', 'S', 'Aa', 'Pp', 'X', 'D', 'R', 'N', 'P', 'K', 'Ii', 'Qq', 'L', 'T', 'Tt', 'B', 'F', 'Jj', 'M', 'Y', 'U', 'O', 'V'] },
      { day: 'SELASA', jk: '8', time: '12.50-13.30', codes: ['E', 'Xx', 'Vv', 'H', 'Rr', 'Pp', 'Ww', 'S', 'Aa', 'Ff', 'Oo', 'D', 'R', 'N', 'P', 'Ss', 'Ii', 'M', 'L', 'T', 'Tt', 'B', 'F', 'Jj', 'J', 'Y', 'U', 'O', 'V'] },
    ];

    let startRowIndex = 8;
    let prevDay = '';
    let dayStartRow = 8;

    scheduleRows.forEach((sr, idx) => {
      const currentR = startRowIndex + idx;
      const row = worksheet.getRow(currentR);

      // Hari
      if (sr.day !== prevDay) {
        if (prevDay && dayStartRow < currentR - 1) {
          worksheet.mergeCells(`A${dayStartRow}:A${currentR - 1}`);
        }
        row.getCell(1).value = sr.day;
        dayStartRow = currentR;
        prevDay = sr.day;
      }

      row.getCell(2).value = sr.jk || '';
      row.getCell(3).value = sr.time || '';

      if (sr.isSpecial) {
        worksheet.mergeCells(`D${currentR}:AF${currentR}`);
        const specCell = row.getCell(4);
        specCell.value = sr.specialText;
        specCell.font = { bold: true, size: 9, name: 'Times New Roman' };
        specCell.alignment = { horizontal: 'center', vertical: 'middle' };
        specCell.fill = headerFill;
      } else if (sr.codes && Array.isArray(sr.codes)) {
        sr.codes.forEach((code, cIdx) => {
          const colNum = 4 + cIdx;
          const cell = row.getCell(colNum);
          cell.value = code;
          cell.font = { size: 9, name: 'Times New Roman' };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      }

      if (sr.piket) {
        const piketCell = row.getCell(33); // Col AG
        piketCell.value = sr.piket;
        piketCell.font = { bold: true, size: 9, name: 'Times New Roman' };
        piketCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Border and Font for A..C
      [1, 2, 3].forEach((colNum) => {
        const cell = row.getCell(colNum);
        cell.font = { bold: colNum === 1, size: 9, name: 'Times New Roman' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    if (dayStartRow < startRowIndex + scheduleRows.length - 1) {
      worksheet.mergeCells(`A${dayStartRow}:A${startRowIndex + scheduleRows.length - 1}`);
    }

    // Add Teacher Legend at the Bottom
    let legendRowIndex = startRowIndex + scheduleRows.length + 3;
    worksheet.getCell(`A${legendRowIndex}`).value = 'Keterangan Kode Guru:';
    worksheet.getCell(`A${legendRowIndex}`).font = { bold: true, size: 11, name: 'Times New Roman' };

    const legendData = [
      ['A', 'Suharto, S.Pd.,M.M.', 'O', 'Istiqomah, S.Pd', 'Cc', 'Melisa Rahmawati, S.Pd', 'Qq', 'Tri Toni Wulandari, S.Pd', 'Ww', 'Reza Lutfi Ananda, S.T'],
      ['B', 'Dra. Titin Faridah, M.M.', 'P', 'Marukhi Yuliani, S.Pd', 'Dd', 'Alifia Nur Pramida, S.Pd', 'Rr', 'Mutiatul Zakiyah, S.Pd', 'Xx', 'Awening Wulan N.R.,S.Pd.,Gr.'],
      ['C', 'Srikhatun, S.Pd', 'Q', 'Riski Pamedharsih, S.Pd', 'Ee', 'Herlambang Jatikusumo, S,Pd', 'Ss', 'Satrio Nanda Nugroho, S.Pd', '', ''],
      ['D', 'Dra. Saijah SW', 'R', 'Nurul Arifiyah, S.Pd', 'Ff', 'Gilang Nefrizal Anggita, S.Pd.', 'Tt', 'Murniasih, S.Kom', '', ''],
      ['E', 'Ita Puspitasari, S.Pd.,M.Pd', 'S', 'M. Sahyudin, S.Pd.', 'Gg', 'Wahyu Indrianto, S.Pd', 'Uu', 'Nurkhasanah, S.Ag', '', ''],
      ['F', 'Atik Aflacha, S.Pd', 'T', 'Andy Handayani, S.Pd', 'Hh', 'Istifadah, S.Pd', 'Vv', 'Etik muzaenah, SE', '', ''],
      ['G', 'Ali Mursyidi, S.Pd', 'U', 'Azizah Tri Lestari, S.Pd', 'Ii', 'Mohammad Teguh Arifiyanto, S.Pd', '', '', '', ''],
      ['H', 'Dra. Etikarwati', 'V', 'Ade Agung Pangabekti, S.Pd.', 'Jj', 'Nila Isnantika Y, S.pd', '', '', '', ''],
      ['I', 'Catur Budiningsih,S.Pd', 'W', 'Emi Fatriyah, S.Pd', 'Kk', 'Dara Amalia AW, S.Pd', '', '', '', ''],
      ['J', 'Martikno, S.Pd', 'X', 'Takhuri, s.Pd', 'Ll', 'Novita Gigih Praharani, S.Pd', '', '', '', ''],
      ['K', 'Rustinah, S.Ag', 'Y', 'Nokipah, S.Pd', 'Mm', 'Hikmah Putri Nofianti, S.Pd', '', '', '', ''],
      ['L', 'Eni Nugraeni, S.Pd', 'Z', 'Susi Herlina, S.Kom', 'Nn', 'Wiwin Ernawati, S.Kom', '', '', '', ''],
      ['M', 'Muzayin,S.Pd.I', 'Aa', 'Dwi Margaretna, S.Pd', 'Oo', 'Catur Aji Krismawan, S.Pd.', '', '', '', ''],
      ['N', 'Sulistyo Apriliawati, S.Pd.', 'Bb', 'Asmawi, S.Pd', 'Pp', 'Moh. Takhril, S.Pd', '', '', '', '']
    ];

    legendData.forEach((rowVals, rIdx) => {
      const row = worksheet.getRow(legendRowIndex + 1 + rIdx);
      let colPos = 1;
      for (let i = 0; i < rowVals.length; i += 2) {
        const code = rowVals[i];
        const name = rowVals[i + 1];
        if (code) {
          row.getCell(colPos).value = code;
          row.getCell(colPos).font = { bold: true, size: 9, name: 'Times New Roman' };
          row.getCell(colPos).alignment = { horizontal: 'center' };
          
          row.getCell(colPos + 1).value = name;
          row.getCell(colPos + 1).font = { size: 9, name: 'Times New Roman' };
          colPos += 4;
        }
      }
    });

    await sendExcelFile(res, workbook, 'Jadwal KBM Januari 2026.xlsx');
  } catch (error) {
    console.error('Error generating schedule template:', error);
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
        if (val && (val.includes('KELAS VII') || val.includes('KELAS VIII') || val.includes('KELAS IX') || val.includes('KELAS 7') || val.includes('KELAS 8') || val.includes('KELAS 9'))) {
          isGridFormat = true;
          gridHeaderRow = r;
          break;
        }
      }
      if (isGridFormat) break;
    }

    const OFFICIAL_TEACHER_LEGEND = {
      'A': 'Suharto',
      'B': 'Titin Faridah',
      'C': 'Srikhatun',
      'D': 'Saijah',
      'E': 'Ita Puspitasari',
      'F': 'Atik Aflacha',
      'G': 'Ali Mursyidi',
      'H': 'Etikarwati',
      'I': 'Catur Budiningsih',
      'J': 'Martikno',
      'K': 'Rustinah',
      'L': 'Eni Nugraeni',
      'M': 'Muzayin',
      'N': 'Sulistyo Apriliawati',
      'O': 'Istiqomah',
      'P': 'Marukhi Yuliani',
      'Q': 'Riski Pamedharsih',
      'R': 'Nurul Arifiyah',
      'S': 'Sahyudin',
      'T': 'Andy Handayani',
      'U': 'Azizah Tri Lestari',
      'V': 'Ade Agung Pangabekti',
      'W': 'Emi Fatriyah',
      'X': 'Takhuri',
      'Y': 'Nokipah',
      'Z': 'Susi Herlina',
      'Aa': 'Dwi Margaretna',
      'Bb': 'Asmawi',
      'Cc': 'Melisa Rahmawati',
      'Dd': 'Alifia Nur Pramida',
      'Ee': 'Herlambang Jatikusumo',
      'Ff': 'Gilang Nefrizal Anggita',
      'Gg': 'Wahyu Indrianto',
      'Hh': 'Istifadah',
      'Ii': 'Mohammad Teguh Arifiyanto',
      'Jj': 'Nila Isnantika',
      'Kk': 'Dara Amalia',
      'Ll': 'Novita Gigih Praharani',
      'Mm': 'Hikmah Putri Nofianti',
      'Nn': 'Wiwin Ernawati',
      'Oo': 'Catur Aji Krismawan',
      'Pp': 'Moh. Takhril',
      'Qq': 'Tri Toni Wulandari',
      'Rr': 'Mutiatul Zakiyah',
      'Ss': 'Satrio Nanda Nugroho',
      'Tt': 'Murniasih',
      'Uu': 'Nurkhasanah',
      'Vv': 'Etik muzaenah',
      'Ww': 'Reza Lutfi Ananda',
      'Xx': 'Awening Wulan'
    };

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
          const foundClass = classes.find(c => {
            const normC = normalize(c.name);
            const normTarget = normalize(className);
            const normCell = normalize(classCellText);
            return normC === normTarget || normC === normCell;
          });

          if (foundClass) {
            colToClassMap[col] = foundClass._id;
          }
        }
      }

      let currentDay = '';

      for (let r = gridHeaderRow + 2; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        
        // Cek Kolom 1..3 untuk deteksi Hari
        for (let c = 1; c <= 3; c++) {
          let cellText = row.getCell(c).text || row.getCell(c).value?.toString() || '';
          if (typeof cellText === 'object') cellText = cellText.result || cellText.text || '';
          cellText = cellText.toUpperCase().trim();
          const matchedDay = validDays.find(d => cellText.includes(d));
          if (matchedDay) {
            currentDay = matchedDay;
            break;
          }
        }

        if (!currentDay) continue;

        // Cari Waktu (misal 07:20-08:00) dan Jam Ke (misal 1, 2) dari kolom 1..5
        let timeVal = '';
        let periodVal = '';

        for (let c = 1; c <= 5; c++) {
          let cellStr = row.getCell(c).text || row.getCell(c).value?.toString() || '';
          if (typeof cellStr === 'object') cellStr = cellStr.result || cellStr.text || '';
          cellStr = cellStr.trim();

          if (/^\d{1,2}$/.test(cellStr) && !periodVal) {
            periodVal = cellStr;
          } else if (/\d{1,2}[:.]\d{2}/.test(cellStr) && !timeVal) {
            timeVal = cellStr;
          }
        }

        if (!timeVal) continue;

        const cleanTimeVal = timeVal.toUpperCase();
        if (cleanTimeVal.includes('ISTIRAHAT') || cleanTimeVal.includes('TADARUS') || cleanTimeVal.includes('UPACARA') || cleanTimeVal.includes('SHOLAT')) {
          continue;
        }

        const timeParts = timeVal.split(/[-–]/).map(t => t.trim().replace('.', ':'));
        if (timeParts.length < 2) continue;
        const startTime = timeParts[0];
        const endTime = timeParts[1];

        // Slot Number (1..8) berdasarkan waktu mulai
        let timeSlotNum = Number(periodVal) || 1;
        if (startTime) {
          const timeDigits = startTime.split(':').map(Number);
          if (timeDigits.length === 2) {
            const minutes = timeDigits[0] * 60 + timeDigits[1];
            if (minutes < 480) timeSlotNum = 1;      // < 08:00
            else if (minutes < 520) timeSlotNum = 2; // 08:00 - 08:40
            else if (minutes < 570) timeSlotNum = 3; // 08:40 - 09:30
            else if (minutes < 610) timeSlotNum = 4; // 09:40 - 10:20
            else if (minutes < 650) timeSlotNum = 5; // 10:20 - 11:00
            else if (minutes < 700) timeSlotNum = 6; // 11:00 - 11:40
            else if (minutes < 750) timeSlotNum = 7; // 12:10 - 12:50
            else timeSlotNum = 8;                    // >= 12:50
          }
        }

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

          let foundTeacher = teachers.find(t => t.teacher_code && t.teacher_code.toString().toLowerCase().trim() === codeVal.toLowerCase());
          if (!foundTeacher) {
            const teacherNameKey = OFFICIAL_TEACHER_LEGEND[codeVal] || OFFICIAL_TEACHER_LEGEND[codeVal.toUpperCase()];
            if (teacherNameKey) {
              foundTeacher = teachers.find(t => normalize(t.full_name).includes(normalize(teacherNameKey)));
              if (foundTeacher) {
                await getCollection('users_guru').updateOne(
                  { _id: foundTeacher._id },
                  { $set: { teacher_code: codeVal } }
                );
                foundTeacher.teacher_code = codeVal;
              }
            }
          }

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

// =========================================================================
// 5 PILAR LAPORAN REKAPITULASI EKSEKUTIF
// =========================================================================

// PILAR 1: Rekap Data Akademik Master (Agregat Sekolah)
exports.getAcademicMasterReport = async (req, res) => {
  try {
    const { class_id } = req.query;
    const activeYear = await getCollection('academic_years').findOne({ is_active: true });
    const classes = await getCollection('classes').find({}).toArray();
    const subjects = await getCollection('subjects').find({}).toArray();
    let queryStudents = {};
    if (class_id && class_id !== 'all') {
      try { queryStudents.class_id = new mongoose.Types.ObjectId(class_id); } catch(e) { queryStudents.class_id = class_id; }
    }
    const students = await getCollection('users_siswa').find(queryStudents).toArray();
    const grades = await getCollection('grades').find({}).toArray();
    const submissions = await getCollection('submissions').find({}).toArray();

    // Map Leger Master
    const studentLegers = students.map(s => {
      const sIdStr = s._id.toString();
      const sClass = classes.find(c => c._id.toString() === s.class_id?.toString());
      
      const subjectScores = {};
      let totalScore = 0;
      let countScore = 0;

      subjects.forEach(sub => {
        const subIdStr = sub._id.toString();
        const studentSubs = submissions.filter(subm => 
          subm.student_id?.toString() === sIdStr && 
          subm.score !== undefined && 
          subm.score !== null
        );
        
        let avgNh = 0;
        if (studentSubs.length > 0) {
          avgNh = studentSubs.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / studentSubs.length;
        }

        const gradeDoc = grades.find(g => 
          g.student_id?.toString() === sIdStr && 
          g.subject_id?.toString() === subIdStr
        );

        const uts = gradeDoc ? Number(gradeDoc.uts || gradeDoc.score_uts || 0) : 0;
        const uas = gradeDoc ? Number(gradeDoc.uas || gradeDoc.score_uas || 0) : 0;
        const finalScore = gradeDoc?.final_score !== undefined ? Number(gradeDoc.final_score) : Math.round((avgNh * 0.4) + (uts * 0.3) + (uas * 0.3));

        subjectScores[sub.name] = finalScore;
        if (finalScore > 0) {
          totalScore += finalScore;
          countScore++;
        }
      });

      const avgFinal = countScore > 0 ? Math.round(totalScore / countScore) : 0;

      return {
        nis: s.nis || '-',
        name: s.full_name,
        class_name: sClass ? sClass.name : '-',
        subject_scores: subjectScores,
        total_score: totalScore,
        avg_score: avgFinal,
        is_tuntas: avgFinal >= 75
      };
    });

    // Subject Breakdown Stats
    const subjectStats = subjects.map(sub => {
      const subIdStr = sub._id.toString();
      let allScores = [];
      studentLegers.forEach(st => {
        if (st.subject_scores[sub.name] !== undefined) {
          allScores.push(st.subject_scores[sub.name]);
        }
      });
      const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
      const max = allScores.length ? Math.max(...allScores) : 0;
      const min = allScores.length ? Math.min(...allScores) : 0;
      const tuntasCount = allScores.filter(sc => sc >= 75).length;
      const tuntasPct = allScores.length ? Math.round((tuntasCount / allScores.length) * 100) : 0;

      return {
        subject_name: sub.name,
        avg_score: avg,
        max_score: max,
        min_score: min,
        tuntas_percentage: tuntasPct
      };
    });

    return res.json({
      success: true,
      academic_year: activeYear ? activeYear.name : 'Genap 2025/2026',
      total_students: students.length,
      subject_stats: subjectStats,
      students_leger: studentLegers
    });
  } catch (error) {
    return res.status(500).json({ error: `Gagal memuat rekap akademik: ${error.message}` });
  }
};

exports.exportAcademicMaster = async (req, res) => {
  try {
    const { class_id } = req.query;
    const classes = await getCollection('classes').find({}).toArray();
    const subjects = await getCollection('subjects').find({}).toArray();
    let queryStudents = {};
    if (class_id && class_id !== 'all') {
      try { queryStudents.class_id = new mongoose.Types.ObjectId(class_id); } catch(e) { queryStudents.class_id = class_id; }
    }
    const students = await getCollection('users_siswa').find(queryStudents).toArray();
    const grades = await getCollection('grades').find({}).toArray();
    const submissions = await getCollection('submissions').find({}).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leger Master Sekolah');

    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', ...subjects.map(s => s.name), 'Rata-Rata', 'Status Ketuntasan'];
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    students.forEach((s, idx) => {
      const sIdStr = s._id.toString();
      const sClass = classes.find(c => c._id.toString() === s.class_id?.toString());
      let total = 0, count = 0;
      const rowData = [idx + 1, s.nis || '-', s.full_name, sClass ? sClass.name : '-'];

      subjects.forEach(sub => {
        const subIdStr = sub._id.toString();
        const studentSubs = submissions.filter(subm => subm.student_id?.toString() === sIdStr && subm.score !== undefined);
        let avgNh = studentSubs.length ? studentSubs.reduce((a, b) => a + (Number(b.score) || 0), 0) / studentSubs.length : 0;
        const gradeDoc = grades.find(g => g.student_id?.toString() === sIdStr && g.subject_id?.toString() === subIdStr);
        const uts = gradeDoc ? Number(gradeDoc.uts || gradeDoc.score_uts || 0) : 0;
        const uas = gradeDoc ? Number(gradeDoc.uas || gradeDoc.score_uas || 0) : 0;
        const finalScore = gradeDoc?.final_score !== undefined ? Number(gradeDoc.final_score) : Math.round((avgNh * 0.4) + (uts * 0.3) + (uas * 0.3));

        rowData.push(finalScore);
        if (finalScore > 0) { total += finalScore; count++; }
      });

      const avg = count > 0 ? Math.round(total / count) : 0;
      rowData.push(avg);
      rowData.push(avg >= 75 ? 'TUNTAS' : 'BELUM TUNTAS');
      worksheet.addRow(rowData);
    });

    await sendExcelFile(res, workbook, 'leger_master_sekolah.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export leger master: ${error.message}` });
  }
};

// PILAR 2: Rekap Kehadiran (Presensi) & Red Flag BK
exports.getAttendanceRecapReport = async (req, res) => {
  try {
    const { class_id } = req.query;
    const classes = await getCollection('classes').find({}).toArray();
    let queryStudents = {};
    if (class_id && class_id !== 'all') {
      try { queryStudents.class_id = new mongoose.Types.ObjectId(class_id); } catch(e) { queryStudents.class_id = class_id; }
    }
    const students = await getCollection('users_siswa').find(queryStudents).toArray();
    const parents = await getCollection('users_ortu').find({}).toArray();
    const attendances = await getCollection('attendance').find({}).toArray();

    const parentMap = {};
    parents.forEach(p => parentMap[p._id.toString()] = p);

    // Class level summary
    const classSummary = classes.map(c => {
      const cIdStr = c._id.toString();
      const classStudents = students.filter(s => s.class_id?.toString() === cIdStr);
      const studentIds = classStudents.map(s => s._id.toString());
      const classAtts = attendances.filter(a => studentIds.includes(a.student_id?.toString()));

      let hadir = 0, sakit = 0, izin = 0, alpa = 0;
      classAtts.forEach(a => {
        const st = (a.status || '').toLowerCase();
        if (st === 'hadir') hadir++;
        else if (st === 'sakit') sakit++;
        else if (st === 'izin') izin++;
        else if (st === 'alpa') alpa++;
      });

      const total = hadir + sakit + izin + alpa;
      const pctHadir = total > 0 ? Math.round((hadir / total) * 100) : 100;

      return {
        class_name: c.name,
        total_students: classStudents.length,
        hadir, sakit, izin, alpa,
        pct_hadir: pctHadir
      };
    });

    // Red Flag Students (Alpa >= 3)
    const redFlagStudents = [];
    students.forEach(s => {
      const sIdStr = s._id.toString();
      const sAtts = attendances.filter(a => a.student_id?.toString() === sIdStr);
      const alpaCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'alpa').length;
      const sakitCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'sakit').length;
      const izinCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'izin').length;
      const hadirCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'hadir').length;

      if (alpaCount >= 1 || (sAtts.length > 0 && alpaCount >= 1)) {
        const sClass = classes.find(c => c._id.toString() === s.class_id?.toString());
        const parent = parentMap[s.parent_id?.toString()];
        redFlagStudents.push({
          student_id: s._id,
          nis: s.nis || '-',
          name: s.full_name,
          class_name: sClass ? sClass.name : '-',
          hadir: hadirCount,
          sakit: sakitCount,
          izin: izinCount,
          alpa: alpaCount,
          parent_name: parent ? parent.full_name : '-',
          parent_phone: parent ? parent.phone : '-'
        });
      }
    });

    return res.json({
      success: true,
      class_summary: classSummary,
      red_flag_students: redFlagStudents.sort((a, b) => b.alpa - a.alpa)
    });
  } catch (error) {
    return res.status(500).json({ error: `Gagal memuat rekap presensi: ${error.message}` });
  }
};

exports.exportAttendanceRecap = async (req, res) => {
  try {
    const classes = await getCollection('classes').find({}).toArray();
    const students = await getCollection('users_siswa').find({}).toArray();
    const parents = await getCollection('users_ortu').find({}).toArray();
    const attendances = await getCollection('attendance').find({}).toArray();

    const parentMap = {};
    parents.forEach(p => parentMap[p._id.toString()] = p);

    const workbook = new ExcelJS.Workbook();
    
    // Tab 1: Rekap per Kelas
    const ws1 = workbook.addWorksheet('Rekapitulasi Kelas');
    ws1.addRow(['No', 'Nama Kelas', 'Jumlah Siswa', 'Total Hadir', 'Sakit', 'Izin', 'Alpa', '% Kehadiran']);
    ws1.getRow(1).font = { bold: true };

    classes.forEach((c, idx) => {
      const cIdStr = c._id.toString();
      const classStudents = students.filter(s => s.class_id?.toString() === cIdStr);
      const studentIds = classStudents.map(s => s._id.toString());
      const classAtts = attendances.filter(a => studentIds.includes(a.student_id?.toString()));

      let hadir = 0, sakit = 0, izin = 0, alpa = 0;
      classAtts.forEach(a => {
        const st = (a.status || '').toLowerCase();
        if (st === 'hadir') hadir++;
        else if (st === 'sakit') sakit++;
        else if (st === 'izin') izin++;
        else if (st === 'alpa') alpa++;
      });
      const total = hadir + sakit + izin + alpa;
      const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
      ws1.addRow([idx + 1, c.name, classStudents.length, hadir, sakit, izin, alpa, `${pct}%`]);
    });

    // Tab 2: Siswa Bermasalah (Alpa)
    const ws2 = workbook.addWorksheet('Red Flag Presensi (BK)');
    ws2.addRow(['No', 'NIS', 'Nama Siswa', 'Kelas', 'Total Alpa', 'Orang Tua / Wali', 'No HP Orang Tua']);
    ws2.getRow(1).font = { bold: true };

    let rIdx = 1;
    students.forEach(s => {
      const sIdStr = s._id.toString();
      const alpaCount = attendances.filter(a => a.student_id?.toString() === sIdStr && (a.status || '').toLowerCase() === 'alpa').length;
      if (alpaCount >= 1) {
        const sClass = classes.find(c => c._id.toString() === s.class_id?.toString());
        const parent = parentMap[s.parent_id?.toString()];
        ws2.addRow([
          rIdx++,
          s.nis || '-',
          s.full_name,
          sClass ? sClass.name : '-',
          alpaCount,
          parent ? parent.full_name : '-',
          parent ? parent.phone : '-'
        ]);
      }
    });

    await sendExcelFile(res, workbook, 'rekapitulasi_presensi_siswa.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export presensi: ${error.message}` });
  }
};

// PILAR 3: Rekap Pengguna & Manajemen Akun
exports.getUserManagementReport = async (req, res) => {
  try {
    const students = await getCollection('users_siswa').find({}).toArray();
    const teachers = await getCollection('users_guru').find({}).toArray();
    const parents = await getCollection('users_ortu').find({}).toArray();
    const classes = await getCollection('classes').find({}).toArray();
    const activities = await getCollection('activities').find({}).sort({ created_at: -1 }).toArray();

    // Group active vs passive
    const userLastLogins = {};
    activities.forEach(a => {
      if (a.user_name && !userLastLogins[a.user_name]) {
        userLastLogins[a.user_name] = a.created_at;
      }
    });

    const rombelSummary = classes.map(c => {
      const count = students.filter(s => s.class_id?.toString() === c._id.toString()).length;
      return {
        class_name: c.name,
        student_count: count
      };
    });

    return res.json({
      success: true,
      total_students: students.length,
      total_teachers: teachers.length,
      total_parents: parents.length,
      rombel_summary: rombelSummary,
      user_logins: userLastLogins
    });
  } catch (error) {
    return res.status(500).json({ error: `Gagal memuat rekap pengguna: ${error.message}` });
  }
};

exports.exportUserManagement = async (req, res) => {
  try {
    const students = await getCollection('users_siswa').find({}).toArray();
    const teachers = await getCollection('users_guru').find({}).toArray();
    const classes = await getCollection('classes').find({}).toArray();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Master Akun & Rombel');
    ws.addRow(['No', 'Nama Pengguna', 'Peran (Role)', 'NIP/NIS', 'Kelas / Pengampu', 'Status']);
    ws.getRow(1).font = { bold: true };

    let i = 1;
    students.forEach(s => {
      const sClass = classes.find(c => c._id.toString() === s.class_id?.toString());
      ws.addRow([i++, s.full_name, 'Siswa', s.nis || '-', sClass ? sClass.name : '-', s.is_active !== false ? 'Aktif' : 'Nonaktif']);
    });
    teachers.forEach(t => {
      ws.addRow([i++, t.full_name, 'Guru', t.nip || t.teacher_code || '-', (t.classes || []).join(', '), t.is_active !== false ? 'Aktif' : 'Nonaktif']);
    });

    await sendExcelFile(res, workbook, 'rekap_pengguna_rombel.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export pengguna: ${error.message}` });
  }
};

// PILAR 4: Rekap Evaluasi & Pelaksanaan Ujian (CBT / Asesmen)
exports.getEvaluationsReport = async (req, res) => {
  try {
    const assignments = await getCollection('assignments').find({}).toArray();
    const submissions = await getCollection('submissions').find({}).toArray();
    const classes = await getCollection('classes').find({}).toArray();

    const evalSummary = assignments.map(a => {
      const aIdStr = a._id.toString();
      const subms = submissions.filter(s => s.assignment_id?.toString() === aIdStr);
      const graded = subms.filter(s => s.score !== undefined && s.score !== null).length;
      const aClass = classes.find(c => c._id.toString() === a.class_id?.toString());

      return {
        assignment_id: a._id,
        title: a.title,
        class_name: aClass ? aClass.name : '-',
        total_submissions: subms.length,
        total_graded: graded,
        total_pending: subms.length - graded
      };
    });

    return res.json({
      success: true,
      total_assignments: assignments.length,
      total_submissions: submissions.length,
      evaluations: evalSummary
    });
  } catch (error) {
    return res.status(500).json({ error: `Gagal memuat rekap evaluasi: ${error.message}` });
  }
};

exports.exportEvaluations = async (req, res) => {
  try {
    const assignments = await getCollection('assignments').find({}).toArray();
    const submissions = await getCollection('submissions').find({}).toArray();
    const classes = await getCollection('classes').find({}).toArray();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Rekap Evaluasi Ujian & Tugas');
    ws.addRow(['No', 'Judul Tugas / Evaluasi', 'Kelas Target', 'Total Mengumpulkan', 'Sudah Dinilai', 'Belum Dinilai']);
    ws.getRow(1).font = { bold: true };

    assignments.forEach((a, idx) => {
      const aIdStr = a._id.toString();
      const subms = submissions.filter(s => s.assignment_id?.toString() === aIdStr);
      const graded = subms.filter(s => s.score !== undefined && s.score !== null).length;
      const aClass = classes.find(c => c._id.toString() === a.class_id?.toString());

      ws.addRow([idx + 1, a.title, aClass ? aClass.name : '-', subms.length, graded, subms.length - graded]);
    });

    await sendExcelFile(res, workbook, 'rekap_evaluasi_tugas.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export evaluasi: ${error.message}` });
  }
};

// PILAR 5: Rekap Sistem & Audit Trail (Pengawasan)
exports.getAuditTrailReport = async (req, res) => {
  try {
    const activities = await getCollection('activities').find({}).sort({ created_at: -1 }).limit(200).toArray();

    const logs = activities.map((a, idx) => ({
      no: idx + 1,
      time: new Date(a.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      user: a.user_name || 'System',
      action: a.action,
      detail: a.detail
    }));

    return res.json({
      success: true,
      total_logs: logs.length,
      logs
    });
  } catch (error) {
    return res.status(500).json({ error: `Gagal memuat audit log: ${error.message}` });
  }
};

exports.exportAuditTrail = async (req, res) => {
  try {
    const activities = await getCollection('activities').find({}).sort({ created_at: -1 }).limit(500).toArray();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Audit Trail & Log Akses');
    ws.addRow(['No', 'Stempel Waktu', 'Pengguna', 'Aktivitas / Aksi', 'Rincian Detail']);
    ws.getRow(1).font = { bold: true };

    activities.forEach((a, idx) => {
      ws.addRow([
        idx + 1,
        new Date(a.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        a.user_name || 'System',
        a.action,
        a.detail
      ]);
    });

    await sendExcelFile(res, workbook, 'audit_trail_keamanan.xlsx');
  } catch (error) {
    res.status(500).json({ error: `Gagal export audit trail: ${error.message}` });
  }
};
