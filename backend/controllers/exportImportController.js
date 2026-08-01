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

          let jk = (getVal('jenis_kelamin') || getVal('gender') || 'Laki-laki').trim();
          if (jk.toUpperCase() === 'P' || jk.toLowerCase().startsWith('perem') || jk.toLowerCase() === 'puan' || jk.toLowerCase() === 'perempuan') {
            jk = 'Perempuan';
          } else {
            jk = 'Laki-laki';
          }

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
            jenis_kelamin: jk,
            gender: jk,
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
      { header: 'jenis_kelamin', key: 'jenis_kelamin', width: 15 },
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
    const worksheet = workbook.addWorksheet('Template Jadwal');

    // Setup column widths
    const colWidths = [12, 6, 14];
    for (let i = 0; i < 29; i++) colWidths.push(5);
    colWidths.push(8);

    worksheet.columns = colWidths.map((w) => ({ width: w }));

    // Styles
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    const grade7Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    const grade8Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    const grade9Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFE6FF' } };

    // TITLE
    worksheet.mergeCells('A1:AG1');
    worksheet.getCell('A1').value = 'TEMPLATE IMPORT JADWAL PELAJARAN';
    worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:AG2');
    worksheet.getCell('A2').value = 'PETUNJUK: Isi kode guru pada kolom kelas yang sesuai';
    worksheet.getCell('A2').font = { italic: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:AG3');
    worksheet.getCell('A3').value = 'Kosongkan jika tidak ada jadwal. Lihat legenda kode guru di bawah.';
    worksheet.getCell('A3').font = { italic: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Row 6: Grade Headers
    worksheet.mergeCells('A6:A7');
    worksheet.getCell('A6').value = 'HARI';
    worksheet.getCell('A6').font = { bold: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A6').fill = headerFill;

    worksheet.mergeCells('B6:B7');
    worksheet.getCell('B6').value = 'JK';
    worksheet.getCell('B6').font = { bold: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('B6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('B6').fill = headerFill;

    worksheet.mergeCells('C6:C7');
    worksheet.getCell('C6').value = 'WAKTU';
    worksheet.getCell('C6').font = { bold: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('C6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('C6').fill = headerFill;

    worksheet.mergeCells('D6:M6');
    worksheet.getCell('D6').value = 'KELAS VII';
    worksheet.getCell('D6').font = { bold: true, size: 11, name: 'Times New Roman' };
    worksheet.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('D6').fill = grade7Fill;

    worksheet.mergeCells('N6:W6');
    worksheet.getCell('N6').value = 'KELAS VIII';
    worksheet.getCell('N6').font = { bold: true, size: 11, name: 'Times New Roman' };
    worksheet.getCell('N6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('N6').fill = grade8Fill;

    worksheet.mergeCells('X6:AF6');
    worksheet.getCell('X6').value = 'KELAS IX';
    worksheet.getCell('X6').font = { bold: true, size: 11, name: 'Times New Roman' };
    worksheet.getCell('X6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('X6').fill = grade9Fill;

    worksheet.mergeCells('AG6:AG7');
    worksheet.getCell('AG6').value = 'PIKET';
    worksheet.getCell('AG6').font = { bold: true, size: 10, name: 'Times New Roman' };
    worksheet.getCell('AG6').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('AG6').fill = headerFill;

    // Row 7: Class Letter Subheaders
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

    // ============================================================
    // STRUCTURE KOSONG - HANYA HEADER DAN WAKTU
    // ============================================================
    const dayData = [
      { day: 'SENIN', slots: [
        { jk: '1', time: '07.20-08.00' },
        { jk: '2', time: '08.00-08.40' },
        { jk: '3', time: '08.40-09.20' },
        { jk: '', time: '09.20-09.40', isSpecial: true, text: 'ISTIRAHAT' },
        { jk: '4', time: '09.40-10.20' },
        { jk: '5', time: '10.20-11.00' },
        { jk: '6', time: '11.00-11.40' },
        { jk: '', time: '11.40-12.10', isSpecial: true, text: 'ISTIRAHAT / SHOLAT DHUHUR' },
        { jk: '7', time: '12.10-12.50' },
        { jk: '8', time: '12.50-13.30' },
      ]},
      { day: 'SELASA', slots: [
        { jk: '', time: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' },
        { jk: '1', time: '07.20-08.00' },
        { jk: '2', time: '08.00-08.40' },
        { jk: '3', time: '08.40-09.20' },
        { jk: '', time: '09.20-09.40', isSpecial: true, text: 'ISTIRAHAT' },
        { jk: '4', time: '09.40-10.20' },
        { jk: '5', time: '10.20-11.00' },
        { jk: '6', time: '11.00-11.40' },
        { jk: '', time: '11.40-12.10', isSpecial: true, text: 'ISTIRAHAT / SHOLAT DHUHUR' },
        { jk: '7', time: '12.10-12.50' },
        { jk: '8', time: '12.50-13.30' },
      ]},
      { day: 'RABU', slots: [
        { jk: '', time: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' },
        { jk: '1', time: '07.20-08.00' },
        { jk: '2', time: '08.00-08.40' },
        { jk: '3', time: '08.40-09.20' },
        { jk: '', time: '09.20-09.40', isSpecial: true, text: 'ISTIRAHAT' },
        { jk: '4', time: '09.40-10.20' },
        { jk: '5', time: '10.20-11.00' },
        { jk: '6', time: '11.00-11.40' },
        { jk: '', time: '11.40-12.10', isSpecial: true, text: 'ISTIRAHAT / SHOLAT DHUHUR' },
        { jk: '7', time: '12.10-12.50' },
        { jk: '8', time: '12.50-13.30' },
      ]},
      { day: 'KAMIS', slots: [
        { jk: '', time: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' },
        { jk: '1', time: '07.20-08.00' },
        { jk: '2', time: '08.00-08.40' },
        { jk: '3', time: '08.40-09.20' },
        { jk: '', time: '09.20-09.40', isSpecial: true, text: 'ISTIRAHAT' },
        { jk: '4', time: '09.40-10.20' },
        { jk: '5', time: '10.20-11.00' },
        { jk: '6', time: '11.00-11.40' },
        { jk: '', time: '11.40-12.10', isSpecial: true, text: 'ISTIRAHAT / SHOLAT DHUHUR' },
        { jk: '7', time: '12.10-12.50' },
        { jk: '8', time: '12.50-13.30' },
      ]},
      { day: 'JUMAT', slots: [
        { jk: '', time: '07.00-09.00', isSpecial: true, text: 'JUMAT BERSIH / SEHAT, SHOLAT DHUHA, ISTIGHOSAH' },
        { jk: '1', time: '09.00-09.40' },
        { jk: '2', time: '09.40-10.20' },
        { jk: '3', time: '10.20-11.00' },
      ]},
      { day: 'SABTU', slots: [
        { jk: '', time: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' },
        { jk: '1', time: '07.20-08.00' },
        { jk: '2', time: '08.00-08.40' },
        { jk: '3', time: '08.40-09.20' },
        { jk: '', time: '09.20-09.40', isSpecial: true, text: 'ISTIRAHAT' },
        { jk: '4', time: '09.40-10.20' },
        { jk: '5', time: '10.20-11.00' },
        { jk: '', time: '11.00-11.15' },
        { jk: '6', time: '11.15-11.55' },
        { jk: '7', time: '11.55-12.35' },
      ]},
    ];

    let rowIndex = 8;

    dayData.forEach((dayInfo) => {
      dayInfo.slots.forEach((slot, idx) => {
        const row = worksheet.getRow(rowIndex);
        const isFirstRow = idx === 0;

        // Hari (kolom A)
        if (isFirstRow) {
          row.getCell(1).value = dayInfo.day;
        }

        // JK (kolom B)
        row.getCell(2).value = slot.jk || '';

        // WAKTU (kolom C)
        row.getCell(3).value = slot.time || '';

        if (slot.isSpecial) {
          // Merge D sampai AF untuk special text
          worksheet.mergeCells(`D${rowIndex}:AF${rowIndex}`);
          const specCell = row.getCell(4);
          specCell.value = slot.text;
          specCell.font = { bold: true, size: 9, name: 'Times New Roman' };
          specCell.alignment = { horizontal: 'center', vertical: 'middle' };
          specCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        } else {
          // Kosongkan semua cell D sampai AF
          for (let col = 4; col <= 31; col++) {
            row.getCell(col).value = '';
          }
        }

        // Style untuk kolom A, B, C
        [1, 2, 3].forEach((colNum) => {
          const cell = row.getCell(colNum);
          cell.font = { bold: colNum === 1, size: 9, name: 'Times New Roman' };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        rowIndex++;
      });

      // Tambahkan baris kosong antar hari
      rowIndex++;
    });

    // ============================================================
    // LEGENDA KODE GURU - AMBIL DARI DATABASE
    // ============================================================
    const teacherLegendRow = rowIndex + 2;
    worksheet.getCell(`A${teacherLegendRow}`).value = 'Keterangan Kode Guru (isi kode ini pada kolom jadwal):';
    worksheet.getCell(`A${teacherLegendRow}`).font = { bold: true, size: 11, name: 'Times New Roman' };

    // Ambil data guru dari database
    const teachers = await getCollection('users_guru').find({ is_active: true }).toArray();
    
    // Format legend data: [Kode, Nama, Kode, Nama, ...] per baris (maks 5 pasang per baris)
    const legendRows = [];
    let currentRow = [];
    
    teachers.forEach((teacher, index) => {
      const code = teacher.teacher_code || teacher.username || teacher.nip || `G${String(index + 1).padStart(2, '0')}`;
      const name = teacher.full_name || teacher.username || '-';
      
      currentRow.push(code);
      currentRow.push(name);
      
      // Setiap 5 pasang (10 kolom) pindah baris
      if (currentRow.length >= 10) {
        legendRows.push([...currentRow]);
        currentRow = [];
      }
    });
    
    // Tambahkan sisa data
    if (currentRow.length > 0) {
      // Tambahkan placeholder kosong hingga genap 10 kolom
      while (currentRow.length < 10) {
        currentRow.push('');
      }
      legendRows.push([...currentRow]);
    }

    // Tulis legend ke worksheet
    legendRows.forEach((rowVals, rIdx) => {
      const row = worksheet.getRow(teacherLegendRow + 1 + rIdx);
      let colPos = 1;
      for (let i = 0; i < rowVals.length; i += 2) {
        const code = rowVals[i];
        const name = rowVals[i + 1];
        if (code) {
          const codeCell = row.getCell(colPos);
          codeCell.value = code;
          codeCell.font = { bold: true, size: 9, name: 'Times New Roman' };
          codeCell.alignment = { horizontal: 'center' };
          codeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };

          const nameCell = row.getCell(colPos + 1);
          nameCell.value = name || '-';
          nameCell.font = { size: 9, name: 'Times New Roman' };
          nameCell.alignment = { horizontal: 'left' };
          colPos += 4;
        }
      }
    });

    // CATATAN PENTING
    const noteRow = teacherLegendRow + legendRows.length + 2;
    worksheet.mergeCells(`A${noteRow}:AG${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = 'CATATAN: Gunakan KODE yang tertera di legenda untuk mengisi jadwal. Format: tulis kode pada kolom kelas yang sesuai. Untuk PIKET, tulis kode guru piket (bisa lebih dari 1 dipisah koma).';
    noteCell.font = { italic: true, size: 9, name: 'Times New Roman', color: { argb: 'FFEF4444' } };
    noteCell.alignment = { horizontal: 'center' };

    await sendExcelFile(res, workbook, 'template_import_jadwal.xlsx');
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
    
    // Cari worksheet yang mengandung data jadwal
    let worksheet = workbook.getWorksheet(1);
    for (const ws of workbook.worksheets) {
      const sheetNameUpper = ws.name.toUpperCase();
      if (sheetNameUpper.includes('JADWAL') || sheetNameUpper.includes('KBM') || sheetNameUpper.includes('GENAP') || sheetNameUpper.includes('GANJIL') || sheetNameUpper.includes('TEMPLATE')) {
        worksheet = ws;
        break;
      }
    }

    const classes = await getCollection('classes').find({}).toArray();
    const subjects = await getCollection('subjects').find({}).toArray();
    const teachers = await getCollection('users_guru').find({}).toArray();

    const normalize = str => str ? str.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    const getCellValueStr = (cell) => {
      if (!cell) return '';
      let val = cell.value;
      if (val === null || val === undefined) {
        val = cell.text;
      }
      if (val === null || val === undefined) return '';

      if (typeof val === 'object') {
        if (val.richText && Array.isArray(val.richText)) {
          val = val.richText.map(r => r.text || '').join('');
        } else if (val.result !== undefined && val.result !== null) {
          val = val.result;
        } else if (val.text !== undefined && val.text !== null) {
          val = val.text;
        } else {
          val = cell.text || '';
        }
      }

      if (val === null || val === undefined || typeof val === 'object') {
        return '';
      }

      return String(val).trim();
    };

    // ============================================================
    // FUNGSI PENCARIAN FLEKSIBEL
    // ============================================================
    const findTeacherByCode = (code) => {
      if (!code) return null;
      const cleanCode = code.toString().trim();
      
      // 1. Cari berdasarkan teacher_code (case insensitive)
      let teacher = teachers.find(t => 
        t.teacher_code && t.teacher_code.toLowerCase() === cleanCode.toLowerCase()
      );
      if (teacher) return teacher;

      // 2. Cari berdasarkan username
      teacher = teachers.find(t => 
        t.username && t.username.toLowerCase() === cleanCode.toLowerCase()
      );
      if (teacher) return teacher;

      // 3. Cari berdasarkan NIP
      teacher = teachers.find(t => 
        t.nip && t.nip.toString().trim() === cleanCode
      );
      if (teacher) return teacher;

      // 4. Cari berdasarkan nama (jika code adalah nama)
      const normalizedClean = normalize(cleanCode);
      teacher = teachers.find(t => {
        if (!t.full_name) return false;
        const normalizedName = normalize(t.full_name);
        return normalizedName === normalizedClean || 
               normalizedName.includes(normalizedClean) ||
               normalizedClean.includes(normalizedName);
      });
      if (teacher) return teacher;

      return null;
    };

    const findSubjectByCode = (code) => {
      if (!code) return null;
      const cleanCode = code.toString().trim();
      
      // 1. Cari berdasarkan kode mapel
      let subject = subjects.find(s => 
        s.code && s.code.toLowerCase() === cleanCode.toLowerCase()
      );
      if (subject) return subject;

      // 2. Cari berdasarkan nama
      const normalizedClean = normalize(cleanCode);
      subject = subjects.find(s => {
        if (!s.name) return false;
        const normalizedName = normalize(s.name);
        return normalizedName === normalizedClean || 
               normalizedName.includes(normalizedClean) ||
               normalizedClean.includes(normalizedName);
      });
      if (subject) return subject;

      return null;
    };

    // ============================================================
    // DETEKSI FORMAT
    // ============================================================
    let isGridFormat = false;
    let gridHeaderRow = 6;

    for (let r = 1; r <= 15; r++) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= 30; c++) {
        const val = getCellValueStr(row.getCell(c)).toUpperCase();
        if (val && (val.includes('KELAS VII') || val.includes('KELAS VIII') || val.includes('KELAS IX') || val.includes('KELAS 7') || val.includes('KELAS 8') || val.includes('KELAS 9'))) {
          isGridFormat = true;
          gridHeaderRow = r;
          break;
        }
      }
      if (isGridFormat) break;
    }

    let success = 0;
    let errors = [];
    const schedulesToInsert = [];
    const validDays = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

    if (isGridFormat) {
      // ============================================================
      // FORMAT GRID (seperti file jadwal asli)
      // ============================================================
      const colToClassMap = {};
      let currentGrade = '';

      const gradeRow = worksheet.getRow(gridHeaderRow);
      const classRow = worksheet.getRow(gridHeaderRow + 1);

      for (let col = 1; col <= 50; col++) {
        let gradeVal = getCellValueStr(gradeRow.getCell(col)).toUpperCase();

        if (gradeVal) {
          if (gradeVal.includes('VIII') || gradeVal.includes('8')) currentGrade = '8';
          else if (gradeVal.includes('VII') || gradeVal.includes('7')) currentGrade = '7';
          else if (gradeVal.includes('IX') || gradeVal.includes('9')) currentGrade = '9';
        }

        let classCellText = getCellValueStr(classRow.getCell(col)).toUpperCase();
        if (classCellText && /^[A-Z]$/.test(classCellText) && currentGrade) {
          const className = `${currentGrade}${classCellText}`;
          const foundClass = classes.find(c => {
            if (!c || !c.name) return false;
            return normalize(c.name) === normalize(className) || 
                   normalize(c.name) === normalize(classCellText);
          });
          if (foundClass) {
            colToClassMap[col] = foundClass._id;
          }
        }
      }

      let currentDay = '';

      const normalizeDayStr = (str) => {
        if (!str) return '';
        const u = String(str).toUpperCase().replace(/['`]/g, '').trim();
        if (u.includes('SENIN')) return 'SENIN';
        if (u.includes('SELASA')) return 'SELASA';
        if (u.includes('RABU')) return 'RABU';
        if (u.includes('KAMIS')) return 'KAMIS';
        if (u.includes('JUMAT')) return 'JUMAT';
        if (u.includes('SABTU')) return 'SABTU';
        return '';
      };

      for (let r = gridHeaderRow + 2; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);

        // Deteksi Hari
        for (let c = 1; c <= 6; c++) {
          const matchedDay = normalizeDayStr(getCellValueStr(row.getCell(c)));
          if (matchedDay) {
            currentDay = matchedDay;
            break;
          }
        }

        if (!currentDay) continue;

        // Deteksi Jam Ke
        let periodVal = '';
        let timeVal = '';

        for (let c = 1; c <= 6; c++) {
          let cellStr = getCellValueStr(row.getCell(c));
          if (/^\d{1,2}$/.test(cellStr) && !periodVal) {
            periodVal = cellStr;
          } else if (/\d{1,2}[:.]\d{2}/.test(cellStr) && !timeVal) {
            timeVal = cellStr;
          }
        }

        let timeSlotNum = Number(periodVal) || 1;

        // Parse waktu
        let startTime = '07:00';
        let endTime = '07:40';
        
        if (timeVal) {
          const cleanTimeVal = timeVal.toUpperCase();
          if (cleanTimeVal.includes('ISTIRAHAT') || cleanTimeVal.includes('TADARUS') || 
              cleanTimeVal.includes('UPACARA') || cleanTimeVal.includes('SHOLAT')) {
            continue;
          }
          const timeParts = timeVal.split(/[-–]/).map(t => t.trim().replace('.', ':'));
          if (timeParts.length >= 2) {
            startTime = timeParts[0];
            endTime = timeParts[1];
          }
        }

        // Baca data per kolom kelas
        for (const [colIndex, classId] of Object.entries(colToClassMap)) {
          let codeVal = getCellValueStr(row.getCell(Number(colIndex)));

          if (!codeVal || codeVal === '-' || codeVal === '/' || codeVal === '.') {
            continue;
          }

          const cleanCode = codeVal.toUpperCase();
          if (cleanCode.includes('ISTIRAHAT') || cleanCode.includes('UPACARA') || 
              cleanCode.includes('TADARUS') || cleanCode.includes('SHOLAT') || 
              cleanCode.includes('BERSIH') || cleanCode.includes('SEHAT')) {
            continue;
          }

          // Cari guru dengan kode
          let foundTeacher = findTeacherByCode(codeVal);
          
          if (!foundTeacher) {
            errors.push(`Baris ${r}, Kolom ${colIndex}: Guru dengan kode '${codeVal}' tidak ditemukan`);
            continue;
          }

          // Cari mapel - dari kode atau dari guru
          let foundSubject = findSubjectByCode(codeVal);
          
          if (!foundSubject) {
            // Ambil mapel pertama dari guru
            const subjectId = foundTeacher.subjects?.[0] || foundTeacher.subject_id || foundTeacher.subject;
            if (subjectId) {
              foundSubject = subjects.find(s => s._id.toString() === subjectId.toString());
            }
          }

          if (!foundSubject) {
            errors.push(`Baris ${r}, Kolom ${colIndex}: Mapel tidak ditemukan untuk kode '${codeVal}'`);
            continue;
          }

          schedulesToInsert.push({
            academic_year_id: activeYear._id,
            class_id: classId,
            subject_id: foundSubject._id,
            teacher_id: foundTeacher._id,
            day: currentDay,
            time_slot: timeSlotNum,
            start_time: startTime,
            end_time: endTime,
            room: '',
            generated_type: 'import',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          });

          success++;
        }

        // Baca PIKET (Kolom AG = 33)
        const piketCode = getCellValueStr(row.getCell(33));
        if (piketCode && piketCode !== '-' && piketCode !== '') {
          const piketCodes = piketCode.split(',').map(c => c.trim()).filter(Boolean);
          for (const pc of piketCodes) {
            const teacher = findTeacherByCode(pc);
            if (teacher) {
              // Update piket pada jadwal yang baru dibuat di slot ini
              const slotSchedules = schedulesToInsert.filter(s => s.day === currentDay && s.time_slot === timeSlotNum);
              for (const s of slotSchedules) {
                s.piket_teacher_id = teacher._id;
              }
            }
          }
        }
      }

    } else {
      // ============================================================
      // FORMAT TEMPLATE (kolom: HARI, JK, WAKTU, KELAS, MAPEL, GURU, RUANG)
      // ============================================================
      let headers = {};
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        const val = getCellValueStr(cell);
        if (val) {
          const key = val.toLowerCase().trim();
          headers[key] = colNumber;
        }
      });

      // Cek apakah ini format template kita
      const isTemplateFormat = headers['hari'] && headers['jam_ke'] && headers['waktu_mulai'] && 
                               headers['waktu_selesai'] && headers['kelas'] && headers['mata_pelajaran'] && headers['guru'];

      if (isTemplateFormat) {
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          if (!row.values || row.values.length === 0) continue;

          try {
            const hari = getCellValueStr(row.getCell(headers['hari'])).toUpperCase();
            const jamKe = parseInt(getCellValueStr(row.getCell(headers['jam_ke']))) || 1;
            const waktuMulai = getCellValueStr(row.getCell(headers['waktu_mulai']));
            const waktuSelesai = getCellValueStr(row.getCell(headers['waktu_selesai']));
            const kelasName = getCellValueStr(row.getCell(headers['kelas']));
            const mapelName = getCellValueStr(row.getCell(headers['mata_pelajaran']));
            const guruName = getCellValueStr(row.getCell(headers['guru']));
            const ruang = headers['ruang'] ? getCellValueStr(row.getCell(headers['ruang'])) : '';

            if (!hari || !kelasName || !mapelName || !guruName) {
              continue;
            }

            if (!validDays.includes(hari)) {
              errors.push(`Baris ${i}: Hari '${hari}' tidak valid`);
              continue;
            }

            // Cari Kelas
            const foundClass = classes.find(c => normalize(c.name) === normalize(kelasName));
            if (!foundClass) {
              errors.push(`Baris ${i}: Kelas '${kelasName}' tidak ditemukan`);
              continue;
            }

            // Cari Mapel
            const foundSubject = findSubjectByCode(mapelName);
            if (!foundSubject) {
              errors.push(`Baris ${i}: Mata Pelajaran '${mapelName}' tidak ditemukan`);
              continue;
            }

            // Cari Guru
            const foundTeacher = findTeacherByCode(guruName);
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
              time_slot: jamKe,
              start_time: waktuMulai || '07:00',
              end_time: waktuSelesai || '07:40',
              room: ruang || '',
              generated_type: 'import',
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            });

            success++;
          } catch (e) {
            errors.push(`Baris ${i}: ${e.message}`);
          }
        }
      } else {
        // ============================================================
        // FORMAT LAIN - Coba deteksi otomatis dari header
        // ============================================================
        // Cari kolom yang mengandung kata kunci
        let dayCol = null, timeCol = null, classCol = null, subjectCol = null, teacherCol = null;
        
        for (const [key, colNum] of Object.entries(headers)) {
          if (key.includes('hari') || key.includes('day')) dayCol = colNum;
          if (key.includes('waktu') || key.includes('time') || key.includes('jam')) timeCol = colNum;
          if (key.includes('kelas') || key.includes('class')) classCol = colNum;
          if (key.includes('mapel') || key.includes('pelajaran') || key.includes('subject')) subjectCol = colNum;
          if (key.includes('guru') || key.includes('teacher')) teacherCol = colNum;
        }

        if (dayCol && classCol && subjectCol && teacherCol) {
          for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.values || row.values.length === 0) continue;

            try {
              const hari = getCellValueStr(row.getCell(dayCol)).toUpperCase();
              const kelasName = getCellValueStr(row.getCell(classCol));
              const mapelName = getCellValueStr(row.getCell(subjectCol));
              const guruName = getCellValueStr(row.getCell(teacherCol));
              const jamKe = timeCol ? parseInt(getCellValueStr(row.getCell(timeCol))) || 1 : 1;

              if (!hari || !kelasName || !mapelName || !guruName) continue;
              if (!validDays.includes(hari)) continue;

              const foundClass = classes.find(c => normalize(c.name) === normalize(kelasName));
              if (!foundClass) {
                errors.push(`Baris ${i}: Kelas '${kelasName}' tidak ditemukan`);
                continue;
              }

              const foundSubject = findSubjectByCode(mapelName);
              if (!foundSubject) {
                errors.push(`Baris ${i}: Mata Pelajaran '${mapelName}' tidak ditemukan`);
                continue;
              }

              const foundTeacher = findTeacherByCode(guruName);
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
                time_slot: jamKe,
                start_time: '07:00',
                end_time: '07:40',
                room: '',
                generated_type: 'import',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
              });

              success++;
            } catch (e) {
              errors.push(`Baris ${i}: ${e.message}`);
            }
          }
        } else {
          return res.status(400).json({ 
            error: 'Format file tidak dikenali. Gunakan template yang disediakan atau pastikan kolom: HARI, JK, WAKTU, KELAS, MAPEL, GURU ada.' 
          });
        }
      }
    }

    // ============================================================
    // SIMPAN DATA
    // ============================================================
    if (schedulesToInsert.length > 0) {
      // Hapus jadwal lama untuk tahun ajaran ini
      await getCollection('schedules').deleteMany({ academic_year_id: activeYear._id });
      await getCollection('schedules').insertMany(schedulesToInsert);

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
      errors: errors.slice(0, 20)
    });

  } catch (error) {
    console.error('Import error:', error);
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
// 5 PILAR LAPORAN REKAPITULASI EKSEKUTIF
// =========================================================================

const getIdStr = (val) => {
  if (!val) return '';
  if (val._id) return val._id.toString();
  return val.toString();
};

// PILAR 1: Rekap Data Akademik Master (Agregat Sekolah)
exports.getAcademicMasterReport = async (req, res) => {
  try {
    const { class_id } = req.query;
    const activeYear = await getCollection('academic_years').findOne({ is_active: true });
    const classes = await getCollection('classes').find({}).toArray();
    classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const subjects = await getCollection('subjects').find({}).toArray();
    let queryStudents = {};
    if (class_id && class_id !== 'all') {
      try { queryStudents.class_id = new mongoose.Types.ObjectId(class_id); } catch (e) { queryStudents.class_id = class_id; }
    }
    const students = await getCollection('users_siswa').find(queryStudents).toArray();
    const grades = await getCollection('grades').find({}).toArray();
    const submissions = await getCollection('submissions').find({}).toArray();

    // Map Leger Master
    const studentLegers = students.map(s => {
      const sIdStr = getIdStr(s._id);
      const sClass = classes.find(c => getIdStr(c._id) === getIdStr(s.class_id));

      const subjectScores = {};
      let totalScore = 0;
      let countScore = 0;

      subjects.forEach(sub => {
        const subIdStr = getIdStr(sub._id);
        const studentSubs = submissions.filter(subm =>
          getIdStr(subm.student_id) === sIdStr &&
          subm.score !== undefined &&
          subm.score !== null
        );

        let avgNh = 0;
        if (studentSubs.length > 0) {
          avgNh = studentSubs.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / studentSubs.length;
        }

        const gradeDoc = grades.find(g =>
          getIdStr(g.student_id) === sIdStr &&
          getIdStr(g.subject_id) === subIdStr
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

    return res.json({
      success: true,
      academic_year: activeYear ? activeYear.name : 'Genap 2025/2026',
      total_students: students.length,
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
    classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const subjects = await getCollection('subjects').find({}).toArray();
    let queryStudents = {};
    if (class_id && class_id !== 'all') {
      try { queryStudents.class_id = new mongoose.Types.ObjectId(class_id); } catch (e) { queryStudents.class_id = class_id; }
    }
    const students = await getCollection('users_siswa').find(queryStudents).toArray();
    const grades = await getCollection('grades').find({}).toArray();
    const submissions = await getCollection('submissions').find({}).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leger Master Sekolah');

    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', ...subjects.map(s => s.name), 'Rata-Rata', 'Status Ketuntasan'];
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };

    students.forEach((s, idx) => {
      const sIdStr = getIdStr(s._id);
      const sClass = classes.find(c => getIdStr(c._id) === getIdStr(s.class_id));
      let total = 0, count = 0;
      const rowData = [idx + 1, s.nis || '-', s.full_name, sClass ? sClass.name : '-'];

      subjects.forEach(sub => {
        const subIdStr = getIdStr(sub._id);
        const studentSubs = submissions.filter(subm => getIdStr(subm.student_id) === sIdStr && subm.score !== undefined);
        let avgNh = studentSubs.length ? studentSubs.reduce((a, b) => a + (Number(b.score) || 0), 0) / studentSubs.length : 0;
        const gradeDoc = grades.find(g => getIdStr(g.student_id) === sIdStr && getIdStr(g.subject_id) === subIdStr);
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
    classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const students = await getCollection('users_siswa').find({}).toArray();
    const parents = await getCollection('users_ortu').find({}).toArray();

    let attendances = await getCollection('attendances').find({}).toArray();
    if (!attendances.length) {
      attendances = await getCollection('attendance').find({}).toArray();
    }

    const parentMap = {};
    parents.forEach(p => parentMap[getIdStr(p._id)] = p);

    // Class level summary
    let targetClasses = classes;
    if (class_id && class_id !== 'all') {
      targetClasses = classes.filter(c => getIdStr(c._id) === class_id);
    }

    const classSummary = targetClasses.map(c => {
      const cIdStr = getIdStr(c._id);
      const classStudents = students.filter(s => getIdStr(s.class_id) === cIdStr);
      const studentIds = classStudents.map(s => getIdStr(s._id));
      const classAtts = attendances.filter(a => studentIds.includes(getIdStr(a.student_id)));

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

    // Red Flag Students (Alpa >= 1)
    const redFlagStudents = [];
    const targetStudents = class_id && class_id !== 'all' ? students.filter(s => getIdStr(s.class_id) === class_id) : students;

    targetStudents.forEach(s => {
      const sIdStr = getIdStr(s._id);
      const sAtts = attendances.filter(a => getIdStr(a.student_id) === sIdStr);
      const alpaCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'alpa').length;
      const sakitCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'sakit').length;
      const izinCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'izin').length;
      const hadirCount = sAtts.filter(a => (a.status || '').toLowerCase() === 'hadir').length;

      if (alpaCount >= 1) {
        const sClass = classes.find(c => getIdStr(c._id) === getIdStr(s.class_id));
        const parent = parentMap[getIdStr(s.parent_id)];
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
    classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const students = await getCollection('users_siswa').find({}).toArray();
    const parents = await getCollection('users_ortu').find({}).toArray();

    let attendances = await getCollection('attendances').find({}).toArray();
    if (!attendances.length) {
      attendances = await getCollection('attendance').find({}).toArray();
    }

    const parentMap = {};
    parents.forEach(p => parentMap[getIdStr(p._id)] = p);

    const workbook = new ExcelJS.Workbook();

    // Tab 1: Rekap per Kelas
    const ws1 = workbook.addWorksheet('Rekapitulasi Kelas');
    ws1.addRow(['No', 'Nama Kelas', 'Jumlah Siswa', 'Total Hadir', 'Sakit', 'Izin', 'Alpa', '% Kehadiran']);
    ws1.getRow(1).font = { bold: true };

    classes.forEach((c, idx) => {
      const cIdStr = getIdStr(c._id);
      const classStudents = students.filter(s => getIdStr(s.class_id) === cIdStr);
      const studentIds = classStudents.map(s => getIdStr(s._id));
      const classAtts = attendances.filter(a => studentIds.includes(getIdStr(a.student_id)));

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
      const sIdStr = getIdStr(s._id);
      const alpaCount = attendances.filter(a => getIdStr(a.student_id) === sIdStr && (a.status || '').toLowerCase() === 'alpa').length;
      if (alpaCount >= 1) {
        const sClass = classes.find(c => getIdStr(c._id) === getIdStr(s.class_id));
        const parent = parentMap[getIdStr(s.parent_id)];
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
    classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const activities = await getCollection('activities').find({}).sort({ created_at: -1 }).toArray();

    const userLastLogins = {};
    activities.forEach(a => {
      if (a.user_name && !userLastLogins[a.user_name]) {
        userLastLogins[a.user_name] = a.created_at;
      }
    });

    const rombelSummary = classes.map(c => {
      const count = students.filter(s => getIdStr(s.class_id) === getIdStr(c._id)).length;
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
    classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Master Akun & Rombel');
    ws.addRow(['No', 'Nama Pengguna', 'Peran (Role)', 'NIP/NIS', 'Kelas / Pengampu', 'Status']);
    ws.getRow(1).font = { bold: true };

    let i = 1;
    students.forEach(s => {
      const sClass = classes.find(c => getIdStr(c._id) === getIdStr(s.class_id));
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
      const aIdStr = getIdStr(a._id);
      const subms = submissions.filter(s => getIdStr(s.assignment_id) === aIdStr);
      const graded = subms.filter(s => s.score !== undefined && s.score !== null).length;
      const aClass = classes.find(c => getIdStr(c._id) === getIdStr(a.class_id));

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
      const aIdStr = getIdStr(a._id);
      const subms = submissions.filter(s => getIdStr(s.assignment_id) === aIdStr);
      const graded = subms.filter(s => s.score !== undefined && s.score !== null).length;
      const aClass = classes.find(c => getIdStr(c._id) === getIdStr(a.class_id));

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
