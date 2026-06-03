const assignmentService = require('../services/assignmentService');
const mongoose = require('mongoose');

// CREATE
exports.createAssignment = async (req, res) => {
  try {
    const teacherId = req.user.id; // dari token
    const assignmentData = { ...req.body, teacher: teacherId };
    const newAssignment = await assignmentService.createAssignment(assignmentData);
    return res.status(201).json({ success: true, data: newAssignment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL (admin)
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await assignmentService.getAllAssignments();
    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET BY ID
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    return res.json({ success: true, data: assignment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
exports.updateAssignment = async (req, res) => {
  try {
    const updated = await assignmentService.updateAssignment(req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE
exports.deleteAssignment = async (req, res) => {
  try {
    await assignmentService.deleteAssignment(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// KHUSUS GURU
exports.getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignments = await assignmentService.getAssignmentsByTeacher(teacherId);
    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// KHUSUS SISWA
exports.getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const siswaCollection = mongoose.connection.collection('users_siswa');
    const student = await siswaCollection.findOne({ _id: new mongoose.Types.ObjectId(studentId) });
    if (!student) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

    const classId = student.class_id;
    if (!classId) return res.json({ success: true, data: [] });

    const assignments = await assignmentService.getAssignmentsForStudent(classId, studentId);
    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};