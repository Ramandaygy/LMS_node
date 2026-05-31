const scheduleService = require('../services/scheduleService');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Schedule = require('../models/Schedule');

exports.createSchedule = async (req, res) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body);
    return res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
};

exports.bulkSaveSchedule = async (req, res) => {
  try {
    const { schedules } = req.body;
    const result = await scheduleService.bulkSaveSchedule(schedules);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('ERROR BULK SAVE:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllSchedules = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    let schedules;
    if (academic_year_id) {
      schedules = await scheduleService.getByAcademicYear(academic_year_id);
    } else {
      schedules = await scheduleService.getAllSchedules();
    }
    return res.json({ success: true, data: schedules });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
  }
};

exports.getTeacherSchedule = async (req, res) => {
  try {
    const data = await scheduleService.getTeacherSchedule(req.params.teacherId, req.query.academic_year_id);
    return res.json({ success: true, schedule: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch teacher schedule' });
  }
};

exports.getClassSchedule = async (req, res) => {
  try {
    const data = await scheduleService.getClassSchedule(req.params.classId, req.query.academic_year_id);
    return res.json({ success: true, schedule: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to fetch class schedule' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const data = await scheduleService.updateSchedule(req.params.id, req.body);
    return res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update schedule' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to delete schedule' });
  }
};

// scheduleController.js
exports.autoGenerateSchedule = async (req, res) => {
  try {
    const { academic_year_id } = req.body;
    if (!academic_year_id) {
      return res.status(400).json({ success: false, message: 'academic_year_id required' });
    }

    // Ambil data master
    const classes = await Class.find({ academic_year_id: academic_year_id });
    const subjects = await Subject.find();
    const teachers = await User.find({ role: 'teacher' });
    const existingSchedules = await Schedule.find({ academic_year_id: academic_year_id });

    // Generate dari AI
    const aiSchedules = await scheduleService.generateScheduleWithAI(
      academic_year_id,
      classes,
      subjects,
      teachers,
      existingSchedules
    );

    // Simpan hasil AI ke database
    const saved = await scheduleService.bulkSaveSchedule(aiSchedules);
    return res.json({ success: true, message: `Berhasil generate ${saved.length} jadwal`, data: saved });
  } catch (err) {
    console.error('Auto generate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};