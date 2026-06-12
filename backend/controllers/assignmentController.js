const assignmentService = require('../services/assignmentService');
const mongoose = require('mongoose');

exports.createAssignment = async (req, res) => {
  try {
    const teacherId = req.user.id; // dari token
    const attachments = [];
    
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({ type: 'file', value: file.filename || file.originalname });
      });
    }
    
    if (req.body.links) {
      const linksArray = Array.isArray(req.body.links) ? req.body.links : [req.body.links];
      linksArray.forEach(link => {
        if (link) attachments.push({ type: 'link', value: link });
      });
    }

    const assignmentData = { ...req.body, teacher: teacherId, attachments };
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
    const attachments = [];
    
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({ type: 'file', value: file.filename || file.originalname });
      });
    }
    
    if (req.body.attachments) {
      const existArray = Array.isArray(req.body.attachments) ? req.body.attachments : [req.body.attachments];
      existArray.forEach(val => {
        if (typeof val === 'string' && val.trim() !== '') {
          attachments.push({ type: 'file', value: val });
        }
      });
    }
    
    if (req.body.links) {
      const linksArray = Array.isArray(req.body.links) ? req.body.links : [req.body.links];
      linksArray.forEach(link => {
        if (link) attachments.push({ type: 'link', value: link });
      });
    }

    const updateData = { ...req.body };
    updateData.attachments = attachments;

    const updated = await assignmentService.updateAssignment(req.params.id, updateData);
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

// KHUSUS ORTU
exports.getOrtuAssignments = async (req, res) => {
  try {
    const childId = req.params.childId;
    const siswaCollection = mongoose.connection.collection('users_siswa');
    const child = await siswaCollection.findOne({ _id: new mongoose.Types.ObjectId(childId) });
    if (!child) return res.status(404).json({ success: false, message: 'Anak tidak ditemukan' });

    const classId = child.class_id;
    if (!classId) return res.json({ success: true, data: [] });

    // Ortu gets the same view of assignments as the student
    const assignments = await assignmentService.getAssignmentsForStudent(classId, childId);
    return res.json({ success: true, data: assignments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};