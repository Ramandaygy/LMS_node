const MaterialProgress = require('../models/MaterialProgress');
const Material = require('../models/Material');
const mongoose = require('mongoose');

exports.getProgressMap = async (studentId, materialIds) => {
  if (!materialIds.length) return {};

  const records = await MaterialProgress.find({
    student: new mongoose.Types.ObjectId(studentId.toString()),
    material: { $in: materialIds.map(id => new mongoose.Types.ObjectId(id.toString())) }
  });

  return Object.fromEntries(
    records.map(r => [r.material.toString(), {
      progress_percent: r.progress_percent,
      completed: r.completed,
      current_slide: r.current_slide,
      total_slides: r.total_slides,
      completed_at: r.completed_at
    }])
  );
};

exports.updateProgress = async (studentId, materialId, data) => {
  const update = {};

  if (data.current_slide !== undefined) update.current_slide = data.current_slide;
  if (data.total_slides !== undefined) update.total_slides = data.total_slides;
  if (data.progress_percent !== undefined) update.progress_percent = data.progress_percent;
  if (data.completed !== undefined) {
    update.completed = data.completed;
    update.completed_at = data.completed ? new Date() : null;
  }

  return MaterialProgress.findOneAndUpdate(
    {
      student: new mongoose.Types.ObjectId(studentId.toString()),
      material: new mongoose.Types.ObjectId(materialId.toString())
    },
    { $set: update },
    { upsert: true, new: true }
  );
};

exports.getStudentMaterialCompletionRate = async (studentId, classId) => {
  if (!classId) return 0;

  const classObjectId = new mongoose.Types.ObjectId(classId.toString());
  const materialIds = await Material.find({ class_id: classObjectId }).distinct('_id');

  if (!materialIds.length) return 0;

  const completedCount = await MaterialProgress.countDocuments({
    student: new mongoose.Types.ObjectId(studentId.toString()),
    material: { $in: materialIds },
    completed: true
  });

  return Math.round((completedCount / materialIds.length) * 100);
};

exports.verifyStudentMaterialAccess = async (studentId, materialId) => {
  const siswaCol = mongoose.connection.collection('users_siswa');
  const student = await siswaCol.findOne({
    _id: new mongoose.Types.ObjectId(studentId.toString())
  });

  if (!student?.class_id) return false;

  const material = await Material.findById(materialId);
  if (!material) return false;

  return material.class_id.toString() === student.class_id.toString();
};
