const Schedule = require('../models/Schedule');

exports.createSchedule = async (data) => {
  return await Schedule.create(data);
};

exports.bulkSaveSchedule = async (scheduleList) => {
  const results = [];
  for (const item of scheduleList) {
    // Cari jadwal existing berdasarkan kombinasi unik
    const existing = await Schedule.findOne({
      class_id: item.class_id,
      academic_year_id: item.academic_year_id,
      day: item.day,
      time_slot: item.time_slot
    });

    if (existing) {
      existing.subject_id = item.subject_id;
      existing.teacher_id = item.teacher_id;
      existing.start_time = item.start_time;
      existing.end_time = item.end_time;
      existing.room = item.room || '';
      // generated_type dan generated_by bisa diupdate jika diperlukan
      await existing.save();
      results.push(existing);
    } else {
      const created = await Schedule.create(item);
      results.push(created);
    }
  }
  return results;
};

exports.getAllSchedules = async () => {
  return await Schedule.find()
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .populate('academic_year_id', 'year semester')
    .sort({ day: 1, time_slot: 1 });
};

exports.getByAcademicYear = async (academicYearId) => {
  return await Schedule.find({ academic_year_id: academicYearId })
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .sort({ day: 1, time_slot: 1 });
};

exports.getTeacherSchedule = async (teacherId, academicYearId) => {
  const filter = { teacher_id: teacherId };
  if (academicYearId) filter.academic_year_id = academicYearId;
  return await Schedule.find(filter)
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .sort({ day: 1, time_slot: 1 });
};

exports.getClassSchedule = async (classId, academicYearId) => {
  const filter = { class_id: classId };
  if (academicYearId) filter.academic_year_id = academicYearId;
  return await Schedule.find(filter)
    .populate('teacher_id', 'full_name')
    .populate('subject_id', 'name code')
    .sort({ day: 1, time_slot: 1 });
};

exports.getTodaySchedule = async (teacherId, day) => {
  return await Schedule.find({ teacher_id: teacherId, day })
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .sort({ start_time: 1 });
};

exports.updateSchedule = async (id, data) => {
  return await Schedule.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteSchedule = async (id) => {
  return await Schedule.findByIdAndDelete(id);
};

exports.deleteByAcademicYear = async (academicYearId) => {
  return await Schedule.deleteMany({ academic_year_id: academicYearId });
};