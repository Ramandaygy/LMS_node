const Material = require('../../models/Material');
const Class = require('../../models/Class');
const Subject = require('../../models/Subject');
const UserGuru = require('../../models/UserGuru');
const { saveUploadedFiles, UPLOAD_FOLDER } = require('../../utils/materialUpload');
const path = require('path');
const fs = require('fs');

// GET /materials
exports.getMaterials = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const materials = await Material.find({ teacher_id: teacherId })
      .sort({ created_at: -1 })
      .lean();

    // Pre-fetch class & subject names
    const classIds = materials.map(m => m.class_id).filter(id => id);
    const subjectIds = materials.map(m => m.subject_id).filter(id => id);
    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const classMap = new Map(classes.map(c => [c._id.toString(), c.name]));
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s.name]));

    const result = materials.map(m => ({
      ...m,
      _id: m._id.toString(),
      teacher_id: m.teacher_id.toString(),
      class_id: m.class_id?.toString(),
      class_name: classMap.get(m.class_id?.toString()) || 'Unknown',
      subject_id: m.subject_id?.toString(),
      subject_name: subjectMap.get(m.subject_id?.toString()) || 'Unknown',
      created_at: m.created_at,
      updated_at: m.updated_at
    }));
    res.json({ materials: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /materials
exports.createMaterial = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, class_id, subject_id, description = '' } = req.body;
    if (!title || !class_id || !subject_id) {
      return res.status(400).json({ error: 'Judul, kelas, mapel wajib diisi' });
    }

    // Validasi class dan subject
    const classDoc = await Class.findById(class_id);
    if (!classDoc) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    const subjectDoc = await Subject.findById(subject_id);
    if (!subjectDoc) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan' });

    // Validasi guru
    const teacher = await UserGuru.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    const teacherSubjects = teacher.subjects.map(id => id.toString());
    const teacherClasses = teacher.classes.map(id => id.toString());
    if (!teacherSubjects.includes(subject_id)) {
      return res.status(403).json({ error: 'Anda tidak diperbolehkan mengupload materi untuk mapel ini' });
    }
    if (!teacherClasses.includes(class_id)) {
      return res.status(403).json({ error: 'Anda tidak diperbolehkan mengupload materi untuk kelas ini' });
    }

    // Upload file
    const files = req.files; // dari multer.array('attachments')
    const attachments = saveUploadedFiles(files);

    const newMaterial = new Material({
      title,
      description,
      class_id,
      subject_id,
      teacher_id: teacherId,
      attachments,
      created_at: new Date(),
      updated_at: new Date()
    });
    await newMaterial.save();
    res.status(201).json({ message: 'Materi berhasil diupload', material_id: newMaterial._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /materials/:material_id
exports.deleteMaterial = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const materialId = req.params.material_id;
    const material = await Material.findOne({ _id: materialId, teacher_id: teacherId });
    if (!material) {
      return res.status(404).json({ error: 'Materi tidak ditemukan atau bukan milik Anda' });
    }

    // Hapus file fisik
    for (const att of material.attachments || []) {
      const filePath = path.join(UPLOAD_FOLDER, att.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await Material.findByIdAndDelete(materialId);
    res.json({ message: 'Materi berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /uploads/materials/:filename
exports.serveMaterialFile = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_FOLDER, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }
  res.sendFile(path.resolve(filePath));
};