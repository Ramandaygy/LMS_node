const assignmentService = require('../services/assignmentService');
const mongoose = require('mongoose');

exports.createAssignment = async (req, res) => {
  try {
    const teacherId = req.user.id; // dari token
    const attachments = [];
    
    if (req.files && req.files.length > 0) {
      const { uploadToSupabase } = require('../services/supabaseService');
      for (const file of req.files) {
        let fileUrl = '';
        try {
          if (file.buffer) {
            fileUrl = await uploadToSupabase(file.buffer, file.originalname, file.mimetype, 'assignments');
          } else if (file.filename) {
            fileUrl = `/uploads/materials/${file.filename}`;
          }
        } catch (uploadErr) {
          console.error('[Assignment Upload Warning]:', uploadErr.message);
          if (file.buffer) {
            const base64Str = file.buffer.toString('base64');
            fileUrl = `data:${file.mimetype};base64,${base64Str}`;
          } else {
            fileUrl = `/uploads/materials/${file.filename || file.originalname}`;
          }
        }
        if (fileUrl) attachments.push({ type: 'file', value: fileUrl });
      }
    }
    
    if (req.body.links) {
      const linksArray = Array.isArray(req.body.links) ? req.body.links : [req.body.links];
      linksArray.forEach(link => {
        if (link) attachments.push({ type: 'link', value: link });
      });
    }

    const assignmentData = { ...req.body, teacher: teacherId, attachments };
    const newAssignment = await assignmentService.createAssignment(assignmentData);

    // Kirim push notification ke siswa dan ortu
    try {
      const notificationController = require('./notificationController');
      const siswaCol = mongoose.connection.collection('users_siswa');
      const classIdStr = (req.body.class || req.body.class_id || '').toString();
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
      
      const subjectName = req.body.title; // Gunakan title tugas sebagai referensi singkat
      const students = await siswaCol.find(query).toArray();
      
      // Notifikasi untuk setiap siswa dan ortu
      for (const student of students) {
        if (student._id) {
          notificationController.sendPushNotification(
            student._id.toString(),
            'Tugas Baru!',
            `Tugas baru telah ditambahkan: ${subjectName}. Tenggat: ${new Date(req.body.deadline).toLocaleDateString('id-ID')}`,
            '/dashboard/siswa/assignments'
          ).catch(e => console.error(e));
        }
        
        if (student.parent_id) {
          notificationController.sendPushNotification(
            student.parent_id.toString(),
            'Tugas Baru untuk Anak Anda',
            `Ada tugas baru untuk ${student.full_name}: ${subjectName}. Tenggat: ${new Date(req.body.deadline).toLocaleDateString('id-ID')}`,
            '/dashboard/ortu'
          ).catch(e => console.error(e));
        }
      }
    } catch (notifErr) {
      console.error('Failed to send push notifications for new assignment:', notifErr);
    }

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
      if (process.env.VERCEL === '1') {
        const { uploadToSupabase } = require('../services/supabaseService');
        for (const file of req.files) {
          if (file.buffer) {
            const fileUrl = await uploadToSupabase(file.buffer, file.originalname, file.mimetype, 'assignments');
            attachments.push({ type: 'file', value: fileUrl });
          }
        }
      } else {
        req.files.forEach(file => {
          attachments.push({ type: 'file', value: `/uploads/materials/${file.filename}` || file.originalname });
        });
      }
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