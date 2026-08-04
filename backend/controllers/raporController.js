const Rapor = require('../models/Rapor');
const mongoose = require('mongoose');

exports.getRaporByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'ID Siswa tidak valid' });
    }

    const objStudentId = new mongoose.Types.ObjectId(studentId);

    // Find class of student
    const studentCol = mongoose.connection.collection('users_siswa');
    const student = await studentCol.findOne({ _id: objStudentId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    let rapor = await Rapor.findOne({ student_id: objStudentId });
    if (!rapor) {
      // Return empty/default template but don't save yet
      const Setting = require('../models/Setting');
      const settings = await Setting.findOne() || {};

      rapor = {
        student_id: objStudentId,
        class_id: student.class_id,
        extracurriculars: [
          { name: 'Pramuka (Wajib)', grade: 'A', note: 'Sangat aktif dan memiliki jiwa kepemimpinan yang baik.' },
          { name: 'PMR', grade: 'B', note: 'Aktif berpartisipasi dalam kegiatan sosial kemanusiaan.' }
        ],
        attendance: { sick: 0, permit: 0, absent: 0 },
        note: 'Ananda memiliki perkembangan akademik yang baik. Pertahankan prestasimu dan tetap tekun belajar.',
        physical_condition: { height: 155, weight: 45 },
        school_name: settings.school_name || 'SMP N 1 SURADADI',
        school_address: settings.school_address || 'Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal 52182',
        headmaster_name: settings.headmaster_name || 'Drs. H. Mulyono, M.Pd.',
        headmaster_nip: settings.headmaster_nip || '19670812 199303 1 004',
        place_date: `Tegal, ${settings.signature_date || '19 Juni 2026'}`
      };
    }

    return res.json({ success: true, data: rapor });
  } catch (err) {
    console.error('Error getting student rapor:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat rapor siswa' });
  }
};

exports.saveRapor = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'ID Siswa tidak valid' });
    }

    const objStudentId = new mongoose.Types.ObjectId(studentId);

    // Get student details to get class_id
    const studentCol = mongoose.connection.collection('users_siswa');
    const student = await studentCol.findOne({ _id: objStudentId });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }

    const {
      extracurriculars,
      attendance,
      note,
      physical_condition,
      school_name,
      school_address,
      headmaster_name,
      headmaster_nip,
      teacher_name,
      teacher_nip,
      place_date,
      semester
    } = req.body;

    let rapor = await Rapor.findOne({ student_id: objStudentId });
    if (!rapor) {
      rapor = new Rapor({
        student_id: objStudentId,
        class_id: student.class_id,
        semester: semester || 'Genap',
        extracurriculars,
        attendance,
        note,
        physical_condition,
        school_name,
        school_address,
        headmaster_name,
        headmaster_nip,
        teacher_name,
        teacher_nip,
        place_date
      });
    } else {
      if (extracurriculars !== undefined) rapor.extracurriculars = extracurriculars;
      if (attendance !== undefined) rapor.attendance = attendance;
      if (note !== undefined) rapor.note = note;
      if (physical_condition !== undefined) rapor.physical_condition = physical_condition;
      if (school_name !== undefined) rapor.school_name = school_name;
      if (school_address !== undefined) rapor.school_address = school_address;
      if (headmaster_name !== undefined) rapor.headmaster_name = headmaster_name;
      if (headmaster_nip !== undefined) rapor.headmaster_nip = headmaster_nip;
      if (teacher_name !== undefined) rapor.teacher_name = teacher_name;
      if (teacher_nip !== undefined) rapor.teacher_nip = teacher_nip;
      if (place_date !== undefined) rapor.place_date = place_date;
      if (semester !== undefined) rapor.semester = semester;
    }

    const savedRapor = await rapor.save();
    return res.json({ success: true, data: savedRapor });
  } catch (err) {
    console.error('Error saving student rapor:', err);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan rapor siswa' });
  }
};
