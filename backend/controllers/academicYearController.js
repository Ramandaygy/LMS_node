const service = require('../services/academicYearService');
const mongoose = require('mongoose');

exports.getAll = async (req, res) => {
  const data = await service.getAll();
  res.json({
    success: true,
    data: data,
    academic_years: data
  });
};

exports.create = async (req, res) => {
  const data = await service.create(req.body);
  res.status(201).json({
    success: true,
    data
  });
};

exports.update = async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  res.json({
    success: true,
    data
  });
};

exports.delete = async (req, res) => {
  await service.delete(req.params.id);
  res.json({
    success: true
  });
};

exports.getCurrent = async (req, res) => {
  const data = await service.getCurrent();
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

exports.promoteWizard = async (req, res) => {
  try {
    const { source_class_id, target_class_id, student_ids, is_graduated } = req.body;
    const yearId = req.params.id;

    if (!source_class_id) {
      return res.status(400).json({ success: false, error: 'Kelas asal wajib dipilih' });
    }

    if (!is_graduated && !target_class_id) {
      return res.status(400).json({ success: false, error: 'Kelas tujuan wajib dipilih' });
    }

    if (!student_ids || student_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Pilih minimal 1 siswa' });
    }

    const result = await service.promoteWizard(yearId, {
      source_class_id,
      target_class_id,
      student_ids,
      is_graduated
    });

    try {
      const AcademicYear = require('../models/AcademicYear');
      const classCol = mongoose.connection.collection('classes');
      const ay = await AcademicYear.findById(yearId);
      const yearLabel = ay ? `${ay.year} - ${ay.semester}` : 'Tahun Ajaran';
      
      const sourceClass = await classCol.findOne({ _id: new mongoose.Types.ObjectId(source_class_id) });
      const sourceClassName = sourceClass?.name || source_class_id;
      
      let targetName = is_graduated ? 'ALUMNI' : target_class_id;
      if (!is_graduated && target_class_id) {
        const targetClass = await classCol.findOne({ _id: new mongoose.Types.ObjectId(target_class_id) });
        targetName = targetClass?.name || target_class_id;
      }
      
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req, 'Kenaikan Kelas (Wizard)', 
        `${student_ids.length} siswa dari kelas ${sourceClassName} dipromosikan ke ${targetName} pada ${yearLabel}.`
      );
    } catch (logErr) {
      console.error('Failed to log promotion activity:', logErr);
    }

    res.json({
      success: true,
      message: `${student_ids.length} siswa berhasil dipromosikan`,
      data: result
    });
  } catch (err) {
    console.error('Error in promoteWizard:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.promoteSemester = async (req, res) => {
  try {
    const result = await service.promoteSemester(req.params.id);
    
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

exports.getAlumniDetail = async (req, res) => {
  try {
    const { yearId, studentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(yearId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID tidak valid' 
      });
    }

    const alumniCol = mongoose.connection.collection('alumni');
    const student = await alumniCol.findOne({ 
      _id: new mongoose.Types.ObjectId(studentId),
      academic_year_id: new mongoose.Types.ObjectId(yearId)
    });
    
    if (!student) {
      const siswaCol = mongoose.connection.collection('users_siswa');
      const siswa = await siswaCol.findOne({ 
        _id: new mongoose.Types.ObjectId(studentId)
      });
      
      if (!siswa) {
        return res.status(404).json({ 
          success: false, 
          error: 'Alumni tidak ditemukan' 
        });
      }
      
      const classCol = mongoose.connection.collection('classes');
      const classData = await classCol.findOne({ 
        _id: siswa.class_id 
      });
      
      const gradeCol = mongoose.connection.collection('grades');
      const grades = await gradeCol.find({ 
        student_id: new mongoose.Types.ObjectId(studentId)
      }).toArray();
      
      const subjectCol = mongoose.connection.collection('subjects');
      const subjects = await subjectCol.find({}).toArray();
      const subjectMap = {};
      subjects.forEach(s => {
        subjectMap[s._id.toString()] = s.name;
      });
      
      const enrichedGrades = grades.map(g => ({
        ...g,
        subject_name: subjectMap[g.subject_id?.toString()] || 'Mata Pelajaran'
      }));
      
      let averageScore = '-';
      const scores = enrichedGrades.filter(g => g.final_score || g.score || g.nilai_akhir);
      if (scores.length > 0) {
        const total = scores.reduce((sum, g) => {
          const val = g.final_score || g.score || g.nilai_akhir || 0;
          return sum + Number(val);
        }, 0);
        averageScore = (total / scores.length).toFixed(2);
      }
      
      return res.json({
        success: true,
        student: {
          _id: siswa._id,
          full_name: siswa.full_name,
          nis: siswa.nis || '-',
          nisn: siswa.nisn || '-',
          graduated_from_class: classData?.name || '-',
          graduated_year: '2025/2026',
          average_score: averageScore
        },
        grades: enrichedGrades
      });
    }
    
    const gradeCol = mongoose.connection.collection('grades');
    const grades = await gradeCol.find({ 
      student_id: new mongoose.Types.ObjectId(studentId)
    }).toArray();
    
    const subjectCol = mongoose.connection.collection('subjects');
    const subjects = await subjectCol.find({}).toArray();
    const subjectMap = {};
    subjects.forEach(s => {
      subjectMap[s._id.toString()] = s.name;
    });
    
    const enrichedGrades = grades.map(g => ({
      ...g,
      subject_name: subjectMap[g.subject_id?.toString()] || 'Mata Pelajaran'
    }));
    
    let averageScore = '-';
    const scores = enrichedGrades.filter(g => g.final_score || g.score || g.nilai_akhir);
    if (scores.length > 0) {
      const total = scores.reduce((sum, g) => {
        const val = g.final_score || g.score || g.nilai_akhir || 0;
        return sum + Number(val);
      }, 0);
      averageScore = (total / scores.length).toFixed(2);
    }
    
    res.json({
      success: true,
      student: {
        ...student,
        average_score: averageScore
      },
      grades: enrichedGrades
    });
    
  } catch (err) {
    console.error('Error fetching alumni detail:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal memuat detail alumni: ' + err.message 
    });
  }
};