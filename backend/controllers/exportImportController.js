const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

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
    worksheet.columns = [ { header: 'name', key: 'name', width: 20 }, { header: 'grade_level', key: 'grade_level', width: 15 }, { header: 'wali_kelas', key: 'wali_kelas', width: 30 }, { header: 'tahun_ajaran', key: 'tahun_ajaran', width: 20 } ];
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
      { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: '_id', as: 'tahun_ajaran' } },
      { $lookup: { from: 'users_ortu', localField: 'parent_id', foreignField: '_id', as: 'orang_tua' } },
      { $project: { _id: 0, nis: 1, full_name: 1, email: 1, username: 1, status: 1, class_name: { $arrayElemAt: ['$kelas.name', 0] }, academic_year: { $arrayElemAt: ['$tahun_ajaran.name', 0] }, orang_tua_nama: { $arrayElemAt: ['$orang_tua.full_name', 0] }, created_at: 1 } }
    ]).toArray();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Siswa');
    worksheet.columns = [ { header: 'nis', key: 'nis', width: 15 }, { header: 'full_name', key: 'full_name', width: 30 }, { header: 'email', key: 'email', width: 30 }, { header: 'username', key: 'username', width: 20 }, { header: 'status', key: 'status', width: 15 }, { header: 'class_name', key: 'class_name', width: 15 }, { header: 'academic_year', key: 'academic_year', width: 15 }, { header: 'orang_tua_nama', key: 'orang_tua_nama', width: 30 }, { header: 'created_at', key: 'created_at', width: 25 } ];
    students.forEach(s => worksheet.addRow(s));
    await sendExcelFile(res, workbook, 'siswa.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal export siswa: ${error.message}` }); }
};

exports.importStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    
    let success = 0, errors = [];
    const default_password = "siswa123";
    const hashed_default = await bcrypt.hash(default_password, 10);
    const classesMap = await getCollection('classes').find({}).toArray();
    const yearMap = await getCollection('academic_years').find({}).toArray();
    const parentMap = await getCollection('users_ortu').find({}).toArray();
    const activeYear = yearMap.find(y => y.is_active === true);

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
            if (cell.value.result !== undefined) return String(cell.value.result).trim();
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
          if (parent_nama) {
            let parent = parentMap.find(p => p.full_name.trim().toLowerCase() === parent_nama.toLowerCase());
            if (!parent) {
              const normInput = normalizeString(parent_nama);
              parent = parentMap.find(p => normalizeString(p.full_name) === normInput);
            }
            if (!parent) {
              const normInput = normalizeString(parent_nama);
              parent = parentMap.find(p => normalizeString(p.full_name).includes(normInput) || normInput.includes(normalizeString(p.full_name)));
            }
            
            if (parent) {
              parent_id = parent._id; 
            } else { 
              errors.push(`Sheet ${worksheet.name} Baris ${i}: Orang tua '${parent_nama}' tidak ditemukan`); 
              continue; 
            }
          }

          let username = email.split('@')[0];
          if (studentUsernameSet.has(username)) { username = `${username}${nis.slice(-3)}`; }

          // Add to local sets so subsequent duplicate records in same sheet are identified
          studentNisSet.add(nis);
          studentEmailSet.add(email);
          studentUsernameSet.add(username);

          studentsToInsert.push({
            nis, full_name, email, username, password: hashed_default, role: 'siswa',
            class_id: class_doc._id, parent_id, academic_year_id: year_id, status: status === 'active' ? 'active' : 'inactive',
            profile: { avatar: null, bio: '', phone: '', address: '' }, created_at: new Date(), updated_at: new Date()
          });
          success++;
        } catch (e) { errors.push(`Sheet ${worksheet.name} Baris ${i}: ${e.message}`); }
      }
    }

    if (studentsToInsert.length > 0) {
      await getCollection('users_siswa').insertMany(studentsToInsert);
    }

    res.json({ message: 'Import siswa selesai', success_count: success, error_count: errors.length, errors: errors.slice(0, 20), default_password });
  } catch (error) { res.status(500).json({ error: `Gagal import siswa: ${error.message}` }); }
};


exports.exportTeachers = async (req, res) => {
  try {
    const teachers = await getCollection('users_guru').aggregate([
      { $lookup: { from: 'subjects', localField: 'subjects', foreignField: '_id', as: 'subject_details' } },
      { $lookup: { from: 'classes', localField: 'classes', foreignField: '_id', as: 'class_details' } },
      { $project: { _id: 0, nip: 1, full_name: 1, email: 1, username: 1, teacher_code: { $ifNull: ['$teacher_code', '$username'] }, subjects: { $map: { input: '$subject_details', as: 's', in: '$$s.name' } }, classes: { $map: { input: '$class_details', as: 'c', in: '$$c.name' } }, is_active: 1, phone: 1 } }
    ]).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Guru');
    worksheet.columns = [
      { header: 'nip', key: 'nip', width: 20 }, { header: 'full_name', key: 'full_name', width: 30 },
      { header: 'email', key: 'email', width: 30 }, { header: 'username', key: 'username', width: 20 },
      { header: 'teacher_code', key: 'teacher_code', width: 15 }, { header: 'subjects', key: 'subjects', width: 30 },
      { header: 'classes', key: 'classes', width: 30 }, { header: 'is_active', key: 'is_active', width: 15 },
      { header: 'phone', key: 'phone', width: 20 }
    ];
    teachers.forEach(t => {
      t.subjects = t.subjects ? t.subjects.join(', ') : '';
      t.classes = t.classes ? t.classes.join(', ') : '';
      worksheet.addRow(t);
    });
    await sendExcelFile(res, workbook, 'guru.xlsx');
  } catch (error) { res.status(500).json({ error: `Gagal export guru: ${error.message}` }); }
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
          if (cell.value.result !== undefined) return String(cell.value.result).trim();
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
