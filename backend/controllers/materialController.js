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
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileType = req.file.mimetype;

      try {
        if (req.file.buffer) {
          const { uploadToSupabase } = require('../services/supabaseService');
          fileUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'materials');
        } else if (req.file.filename) {
          fileUrl = `/uploads/materials/${req.file.filename}`;
        }
      } catch (uploadErr) {
        console.error('[UploadToSupabase Warning]:', uploadErr.message);
        if (req.file.buffer) {
          const base64Str = req.file.buffer.toString('base64');
          fileUrl = `data:${req.file.mimetype};base64,${base64Str}`;
        } else {
          fileUrl = `/uploads/materials/${req.file.filename || req.file.originalname}`;
        }
      }
    }

    let classIdVal = null;
    if (req.body.class_id) {
      try { classIdVal = new mongoose.Types.ObjectId(req.body.class_id.toString()); } catch (e) { classIdVal = req.body.class_id; }
    }
    let subjectIdVal = null;
    if (req.body.subject_id) {
      try { subjectIdVal = new mongoose.Types.ObjectId(req.body.subject_id.toString()); } catch (e) { subjectIdVal = req.body.subject_id; }
    }
    let teacherIdVal = teacherId;
    try { teacherIdVal = new mongoose.Types.ObjectId(teacherId.toString()); } catch (e) { teacherIdVal = teacherId; }

    const isPublished = (req.body.is_published === 'true' || req.body.is_published === true) && !!classIdVal;

    const materialData = {
      title: req.body.title,
      description: req.body.description || '',
      content: req.body.content || '',
      class_id: classIdVal,
      subject_id: subjectIdVal,
      uploaded_by: teacherIdVal,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      external_link: req.body.external_link || '',
      is_published: isPublished,
      order: parseInt(req.body.order) || 0
    };

    const material = await materialService.createMaterial(materialData);

    // Kirim push notification HANYA jika materi dipublikasikan langsung ke kelas
    if (isPublished && classIdVal) {
      try {
        const notificationController = require('./notificationController');
        const siswaCol = mongoose.connection.collection('users_siswa');
        const classIdStr = classIdVal.toString();
      let classIdObj;
      try {
        classIdObj = new mongoose.Types.ObjectId(classIdStr);
      } catch (e) {
        classIdObj = null;
      }
      
      const query = {
        $or: [
          { class_id: classIdStr },
          ...(classIdObj ? [{ class_id: classIdObj }] : [])
        ]
      };
      
      const materialTitle = req.body.title;
      const students = await siswaCol.find(query).toArray();
      
      for (const student of students) {
        if (student._id) {
          notificationController.sendPushNotification(
            student._id.toString(),
            'Materi Baru!',
            `Materi baru telah diunggah: ${materialTitle}.`,
            '/dashboard/siswa/materials'
          ).catch(e => console.error(e));
        }
        
        if (student.parent_id) {
          notificationController.sendPushNotification(
            student.parent_id.toString(),
            'Materi Baru untuk Anak Anda',
            `Ada materi baru untuk ${student.full_name}: ${materialTitle}.`,
            '/dashboard/ortu'
          ).catch(e => console.error(e));
        }
      }
    } catch (notifErr) {
      console.error('Failed to send push notifications for new material:', notifErr);
    }

    return res.status(201).json({ success: true, data: material });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GENERATE KONTEN MATERI DENGAN AI (Backend Auto-Prompting)
exports.generateMaterial = async (req, res) => {
  try {
    const { title, prompt, subject_name, class_name, description } = req.body;

    if (!title && !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Judul materi atau topik wajib diisi terlebih dahulu'
      });
    }

    const aiData = await materialService.generateMaterialAI({
      title,
      prompt,
      subject_name,
      class_name,
      description
    });

    return res.status(200).json({
      success: true,
      data: aiData
    });
  } catch (err) {
    console.error('[GenerateMaterial Err]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// BATCH DISTRIBUSI MATERI DARI BANK KE KELAS TARGET
exports.distributeMaterialsBatch = async (req, res) => {
  try {
    const { material_ids, class_id } = req.body;

    if (!material_ids || !Array.isArray(material_ids) || material_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Pilih minimal 1 materi untuk didistribusikan' });
    }
    if (!class_id) {
      return res.status(400).json({ success: false, message: 'Pilih kelas target distribusi' });
    }

    const MaterialModel = require('../models/Material');
    let classIdObj;
    try {
      classIdObj = new mongoose.Types.ObjectId(class_id.toString());
    } catch (e) {
      classIdObj = class_id;
    }

    await MaterialModel.updateMany(
      { _id: { $in: material_ids.map(id => new mongoose.Types.ObjectId(id.toString())) } },
      {
        $set: {
          class_id: classIdObj,
          is_published: true
        }
      }
    );

    // Send push notification to students of that class
    try {
      const notificationController = require('./notificationController');
      const siswaCol = mongoose.connection.collection('users_siswa');
      const classIdStr = class_id.toString();
      const students = await siswaCol.find({
        $or: [
          { class_id: classIdStr },
          ...(classIdObj ? [{ class_id: classIdObj }] : [])
        ]
      }).toArray();

      for (const student of students) {
        if (student._id) {
          notificationController.sendPushNotification(
            student._id.toString(),
            'Materi Pembelajaran Baru!',
            `${material_ids.length} materi baru telah didistribusikan untuk kelas Anda.`,
            '/dashboard/siswa/materials'
          ).catch(e => console.error(e));
        }
      }
    } catch (notifErr) {
      console.error('Failed to send push notification for batch material distribution:', notifErr);
    }

    return res.json({ success: true, message: 'Materi berhasil didistribusikan ke kelas target' });
  } catch (err) {
    console.error('[DistributeBatch Err]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE MATERI

// GENERATE QUIZ DENGAN AI (Gemini)
exports.generateQuiz = async (req, res) => {
  try {
    const subjectName = req.body.subject_name || req.body.subject || 'Umum';

    const questions = await materialService.generateQuizQuestionAI({ subject_name: subjectName });
    return res.json({
      success: true,
      questions: Array.isArray(questions) ? questions : [questions],
      data: { question: typeof questions === 'string' ? questions : (questions[0]?.question || '') }
    });
  } catch (err) {
    console.error('Error generating quiz AI:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat kuis otomatis via AI: ' + err.message });
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