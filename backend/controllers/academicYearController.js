const service =
  require('../services/academicYearService');

exports.getAll =
  async (req, res) => {

    const data =
      await service.getAll();

    res.json({
      success: true,
      academic_years: data
    });
  };

exports.create =
  async (req, res) => {

    const data =
      await service.create(
        req.body
      );

    res.status(201).json({
      success: true,
      data
    });
  };

exports.update =
  async (req, res) => {

    const data =
      await service.update(
        req.params.id,
        req.body
      );

    res.json({
      success: true,
      data
    });
  };

exports.delete =
  async (req, res) => {

    await service.delete(
      req.params.id
    );

    res.json({
      success: true
    });
  };

exports.getCurrent =
  async (req, res) => {

    const data =
      await service.getCurrent();

    res.json(data);
  };

exports.getAlumniByYear = async (req, res) => {
  try {
    const data = await service.getAlumniByYear(req.params.id);
    res.json({ success: true, alumni: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.promoteStudents = async (req, res) => {
  try {
    const result = await service.promoteStudents(req.params.id);
    
    // Log Activity
    try {
      const AcademicYear = require('../models/AcademicYear');
      const ay = await AcademicYear.findById(req.params.id);
      const yearLabel = ay ? `${ay.year} - ${ay.semester}` : 'Tahun Ajaran';
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req, 'Kenaikan Kelas', `Kenaikan kelas pada ${yearLabel}. ${result.promotedTo8} siswa naik ke kelas 8, ${result.promotedTo9} siswa naik ke kelas 9, dan ${result.graduated} siswa lulus.`);
    } catch (logErr) {
      console.error('Failed to log promotion activity:', logErr);
    }

    res.json({ success: true, message: 'Kenaikan kelas dan pengacakan siswa berhasil dilakukan.', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.promoteSemester = async (req, res) => {
  try {
    const result = await service.promoteSemester(req.params.id);
    
    // Log Activity
    try {
      const AcademicYear = require('../models/AcademicYear');
      const ay = await AcademicYear.findById(req.params.id);
      const yearLabel = ay ? `${ay.year} - ${ay.semester}` : 'Tahun Ajaran';
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req, 'Kenaikan Semester', `Kenaikan semester dari semester ${result.previous_semester} ke ${result.active_semester} pada tahun ajaran ${result.year}.`);
    } catch (logErr) {
      console.error('Failed to log promotion activity:', logErr);
    }

    res.json({ 
      success: true, 
      message: `Kenaikan semester berhasil dari semester ${result.previous_semester} ke ${result.active_semester}.`, 
      data: result 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};