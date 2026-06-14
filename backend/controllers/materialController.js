const materialService = require('../services/materialService');
const materialProgressService = require('../services/materialProgressService');
const mongoose = require('mongoose');

// CREATE MATERIAL (manual upload)
exports.createMaterial = async (req, res) => {
  try {
    const teacherId = req.user.id;
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let fileType = '';

    if (req.file) {
      if (process.env.VERCEL === '1' && req.file.buffer) {
        const { uploadToSupabase } = require('../services/supabaseService');
        fileUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'materials');
      } else {
        fileUrl = `/uploads/materials/${req.file.filename}`;
      }
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileType = req.file.mimetype;
    }

    const materialData = {
      title: req.body.title,
      description: req.body.description || '',
      content: req.body.content || '',
      class_id: req.body.class_id,
      subject_id: req.body.subject_id,
      uploaded_by: teacherId,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      external_link: req.body.external_link || '',
      is_published: req.body.is_published !== 'false' && req.body.is_published !== false,
      order: parseInt(req.body.order) || 0
    };

    const material = await materialService.createMaterial(materialData);
    return res.status(201).json({ success: true, data: material });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GENERATE MATERIAL DENGAN AI (tidak perlu file, hanya teks)
exports.generateMaterial = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { prompt, titleSuggestion, class_id, subject_id } = req.body;

    if (!prompt || !class_id || !subject_id) {
      return res.status(400).json({
        success: false,
        message: 'Prompt, kelas, dan mata pelajaran wajib diisi'
      });
    }

    const material = await materialService.generateMaterialAI({
      prompt,
      titleSuggestion,
      class_id,
      subject_id,
      uploaded_by: teacherId
    });
    return res.json({ success: true, data: material });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL (admin)
exports.getAllMaterials = async (req, res) => {
  try {
    const materials = await materialService.getAllMaterials();
    return res.json({ success: true, data: materials });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET BY ID
exports.getMaterialById = async (req, res) => {
  try {
    const material = await materialService.getMaterialById(req.params.id);
    if (!material) return res.status(404).json({ success: false, message: 'Material not found' });
    return res.json({ success: true, data: material });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
exports.updateMaterial = async (req, res) => {
  try {
    const updated = await materialService.updateMaterial(req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteMaterial = async (req, res) => {
  try {
    await materialService.deleteMaterial(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// MATERI YANG DIUPLOAD GURU
exports.getTeacherMaterials = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const materials = await materialService.getMaterialsByTeacher(teacherId);
    return res.json({ success: true, data: materials });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// MATERI UNTUK SISWA
exports.getStudentMaterials = async (req, res) => {
  try {
    const studentId = req.user.id;
    const siswaCol = mongoose.connection.collection('users_siswa');
    const student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(studentId) });
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    const classId = student.class_id;
    if (!classId) return res.json({ success: true, data: [] });
    const materials = await materialService.getMaterialsForStudent(classId.toString());
    const progressMap = await materialProgressService.getProgressMap(
      studentId,
      materials.map(m => m._id)
    );

    const enriched = materials.map(m => ({
      ...m,
      progress: progressMap[m._id.toString()] || {
        progress_percent: 0,
        completed: false,
        current_slide: 0,
        total_slides: 1,
        completed_at: null
      }
    }));

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE PROGRESS MATERI (SISWA)
exports.updateMaterialProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const materialId = req.params.id;
    const { current_slide, total_slides, progress_percent, completed } = req.body;

    const hasAccess = await materialProgressService.verifyStudentMaterialAccess(studentId, materialId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Akses materi ditolak' });
    }

    const progress = await materialProgressService.updateProgress(studentId, materialId, {
      current_slide,
      total_slides,
      progress_percent,
      completed
    });

    return res.json({ success: true, data: progress });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};