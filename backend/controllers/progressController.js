const progressService = require('../services/progressService');
const mongoose = require('mongoose');

// ===== SISWA =====
exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const progress = await progressService.getStudentProgress(studentId);
    res.json({ success: true, data: progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ===== GURU =====
exports.getClassStudentsProgress = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    // Verifikasi guru mengajar di kelas ini
    const classCollection = mongoose.connection.collection('classes');
    const classDoc = await classCollection.findOne({ _id: new mongoose.Types.ObjectId(classId) });
    if (!classDoc) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // Ambil semua siswa di kelas
    const studentsCollection = mongoose.connection.collection('users_siswa');
    const students = await studentsCollection.find({ class_id: new mongoose.Types.ObjectId(classId) }).toArray();
    
    // Ambil progress untuk setiap siswa
    const progressData = await Promise.all(
      students.map(async (student) => {
        const progress = await progressService.getStudentProgress(student._id.toString());
        return {
          student_id: student._id,
          student_name: student.full_name,
          nis: student.nis,
          avgScore: progress.avgScore,
          attendanceRate: progress.attendanceRate,
          materialCompletionRate: progress.materialCompletionRate,
          risk: progress.risk,
          message: progress.message,
          color: progress.color
        };
      })
    );

    res.json({ 
      success: true, 
      class_name: classDoc.name,
      data: progressData 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ===== ORTU =====
exports.getChildProgress = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;
    // Verifikasi bahwa anak milik orang tua ini
    const ortuCollection = mongoose.connection.collection('users_ortu');
    const parent = await ortuCollection.findOne({ _id: new mongoose.Types.ObjectId(parentId) });
    if (!parent || !parent.children || !parent.children.some(id => id.toString() === childId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const progress = await progressService.getStudentProgress(childId);
    res.json({ success: true, data: progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};