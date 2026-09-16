const GradeInputPeriod = require('../models/GradeInputPeriod');
const GradeInputAccess = require('../models/GradeInputAccess');
const AcademicYear = require('../models/AcademicYear');

// GET /api/grade-input-periods?academic_year_id=...
exports.getPeriods = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    
    let query = {};
    if (academic_year_id) {
      query.academic_year_id = academic_year_id;
    } else {
      // If not provided, get active academic year
      const activeYear = await AcademicYear.findOne({ is_active: true });
      if (activeYear) {
        query.academic_year_id = activeYear._id;
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const periods = await GradeInputPeriod.find(query)
      .populate('academic_year_id', 'year semester')
      .sort({ start_date: 1 });

    res.json({ success: true, data: periods });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/grade-input-periods
exports.createPeriod = async (req, res) => {
  try {
    const { academic_year_id, type, label, start_date, end_date } = req.body;

    const existing = await GradeInputPeriod.findOne({ academic_year_id, type });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Periode untuk jenis penilaian ini sudah ada pada tahun ajaran tersebut.' });
    }

    const period = new GradeInputPeriod({
      academic_year_id,
      type,
      label,
      start_date,
      end_date,
      created_by: req.user.id
    });

    await period.save();
    res.json({ success: true, data: period, message: 'Periode berhasil ditambahkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/grade-input-periods/:id
exports.getPeriodById = async (req, res) => {
  try {
    const period = await GradeInputPeriod.findById(req.params.id)
      .populate('academic_year_id', 'year semester');
      
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });

    const accesses = await GradeInputAccess.find({ period_id: period._id })
      .populate('teacher_id', 'full_name')
      .populate('subject_id', 'name')
      .populate('class_id', 'name')
      .populate('granted_by', 'full_name role')
      .sort({ created_at: -1 });

    res.json({ success: true, data: { period, accesses } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/grade-input-periods/:id
exports.updatePeriod = async (req, res) => {
  try {
    const { start_date, end_date, label } = req.body;
    
    const period = await GradeInputPeriod.findById(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });

    if (start_date) period.start_date = start_date;
    if (end_date) period.end_date = end_date;
    if (label) period.label = label;

    await period.save();
    res.json({ success: true, data: period, message: 'Periode berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/grade-input-periods/:id
exports.deletePeriod = async (req, res) => {
  try {
    const period = await GradeInputPeriod.findById(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });

    await GradeInputAccess.deleteMany({ period_id: period._id });
    await period.deleteOne();

    res.json({ success: true, message: 'Periode berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/grade-input-periods/:id/access
exports.grantAccess = async (req, res) => {
  try {
    const { teacher_id, subject_id, class_id, access_until, reason } = req.body;
    
    const period = await GradeInputPeriod.findById(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan' });

    const access = new GradeInputAccess({
      period_id: period._id,
      teacher_id,
      subject_id: (subject_id && subject_id.trim()) ? subject_id : undefined,
      class_id: (class_id && class_id.trim()) ? class_id : undefined,
      access_until,
      reason: reason || '',
      granted_by: req.user.id
    });

    await access.save();
    
    const populated = await GradeInputAccess.findById(access._id)
      .populate('teacher_id', 'full_name')
      .populate('subject_id', 'name')
      .populate('class_id', 'name')
      .populate('granted_by', 'full_name role');

    res.json({ success: true, data: populated, message: 'Akses khusus berhasil diberikan' });
  } catch (err) {
    console.error('Error granting access:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// DELETE /api/grade-input-periods/access/:accessId
exports.revokeAccess = async (req, res) => {
  try {
    const access = await GradeInputAccess.findById(req.params.accessId);
    if (!access) return res.status(404).json({ success: false, message: 'Akses khusus tidak ditemukan' });

    await access.deleteOne();
    res.json({ success: true, message: 'Akses khusus berhasil dicabut' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper yang bisa dipanggil dari controller lain (seperti guruController)
exports.checkGradeInputStatusHelper = async (type, teacherId) => {
  const Setting = require('../models/Setting');
  const settings = await Setting.findOne();
  if (settings && settings.grade_input_status === 'closed') {
    return { isOpen: false, reason: 'Penginputan nilai telah ditutup oleh Administrator (Tutup Paksa)' };
  }
  if (settings && settings.grade_input_status === 'open') {
    return { isOpen: true, reason: 'Buka Paksa Aktif' };
  }

  const activeYear = await AcademicYear.findOne({ is_active: true });
  if (!activeYear) return { isOpen: false, reason: 'Tidak ada tahun ajaran aktif' };

  const period = await GradeInputPeriod.findOne({ academic_year_id: activeYear._id, type });
  
  if (period) {
    if (period.is_open) {
      return { isOpen: true, reason: `Periode penginputan ${period.label} sedang aktif (sampai ${new Date(period.end_date).toLocaleDateString()})` };
    }

    const access = await GradeInputAccess.findOne({ period_id: period._id, teacher_id: teacherId })
      .sort({ access_until: -1 });

    if (access && access.is_active) {
      return { isOpen: true, reason: `Akses khusus aktif sampai ${new Date(access.access_until).toLocaleString()}` };
    }
    
    return { isOpen: false, reason: `Periode penginputan ${period.label} telah ditutup pada ${new Date(period.end_date).toLocaleString()}` };
  }

  return { isOpen: true, reason: 'Belum ada periode yang dikonfigurasi (Default Open)' };
};

// GET /api/grade-input-periods/check-status
exports.checkStatus = async (req, res) => {
  try {
    const { type = 'tugas' } = req.query;
    const teacherId = req.user.id;
    
    const data = await exports.checkGradeInputStatusHelper(type, teacherId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
