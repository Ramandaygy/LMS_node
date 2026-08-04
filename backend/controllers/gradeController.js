const gradeService = require(
  '../services/gradeService'
);

// ======================================
// CREATE GRADE
// ======================================
exports.createGrade =
  async (req, res) => {

    try {
      const payload = {
        ...req.body,
        teacher: req.user.id
      };

      const grade =
        await gradeService.createGrade(
          payload
        );

      return res.status(201).json({
        success: true,
        data: grade,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create grade',
      });
    }
  };

// ======================================
// GET ALL GRADES
// ======================================
exports.getAllGrades =
  async (req, res) => {

    try {

      const grades =
        await gradeService.getAllGrades();

      return res.status(200).json({
        success: true,
        data: grades,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch grades',
      });
    }
  };

// ======================================
// GET CLASS REKAP GRADES (LEGER MAPEL)
// ======================================
exports.getClassRekapGrades = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subject_id } = req.query;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    const mongoose = require('mongoose');
    const classCol = mongoose.connection.collection('classes');
    let classDoc = null;
    let objClassId = null;

    if (mongoose.Types.ObjectId.isValid(classId)) {
      objClassId = new mongoose.Types.ObjectId(classId);
      classDoc = await classCol.findOne({ _id: objClassId });
    } else {
      classDoc = await classCol.findOne({ name: classId });
    }

    const classConditions = [];
    if (objClassId) classConditions.push({ class_id: objClassId });
    classConditions.push({ class_id: classId.toString() });
    if (classDoc && classDoc.name) {
      classConditions.push({ class_id: classDoc.name });
      classConditions.push({ class_name: classDoc.name });
    }

    // 1. Fetch class students
    const studentCol = mongoose.connection.collection('users_siswa');
    const students = await studentCol.find({
      is_active: { $ne: false },
      $or: classConditions
    }).sort({ full_name: 1 }).toArray();

    if (!students || students.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const studentIds = students.map(s => s._id);
    const studentIdStrings = students.map(s => s._id.toString());

    // 2. Fetch assignments for this class and subject (to extract T1, T2, T3)
    const assignmentCol = mongoose.connection.collection('assignments');
    const assignmentFilter = {
      $or: classConditions
    };
    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) {
      assignmentFilter.subject = new mongoose.Types.ObjectId(subject_id);
    }
    const assignments = await assignmentCol.find(assignmentFilter).sort({ createdAt: 1 }).limit(3).toArray();
    const assignmentIds = assignments.map(a => a._id);
    const assignmentIdStrings = assignments.map(a => a._id.toString());

    // 3. Fetch submissions for these assignments
    const submissions = await mongoose.connection.collection('submissions').find({
      student_id: { $in: [...studentIds, ...studentIdStrings] },
      assignment_id: { $in: [...assignmentIds, ...assignmentIdStrings] },
      score: { $ne: null }
    }).toArray();

    // Map submissions: student_id -> assignment_id -> score
    const submissionMap = {};
    submissions.forEach(sub => {
      const sId = sub.student_id ? sub.student_id.toString() : '';
      const aId = sub.assignment_id ? sub.assignment_id.toString() : '';
      if (!submissionMap[sId]) {
        submissionMap[sId] = {};
      }
      submissionMap[sId][aId] = sub.score;
    });

    // 4. Fetch UTS and UAS grades from Grade model
    const Grade = require('../models/Grade');
    const gradeFilter = {
      student: { $in: [...studentIds, ...studentIdStrings] },
      type: { $in: ['uts', 'uas'] }
    };
    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) {
      gradeFilter.subject = new mongoose.Types.ObjectId(subject_id);
    }
    const grades = await Grade.find(gradeFilter).lean();

    // Map grades: student_id -> type -> score
    const gradeMap = {};
    grades.forEach(g => {
      const sId = g.student ? g.student.toString() : '';
      const type = g.type; // 'uts' or 'uas'
      if (!gradeMap[sId]) {
        gradeMap[sId] = {};
      }
      gradeMap[sId][type] = g.score;
    });

    // 5. Build final rekap array
    const data = students.map(st => {
      const sIdStr = st._id.toString();
      const studentSubs = submissionMap[sIdStr] || {};
      const studentGrades = gradeMap[sIdStr] || {};

      // Get scores for first 3 assignments
      const t1 = assignments[0] ? studentSubs[assignments[0]._id.toString()] : null;
      const t2 = assignments[1] ? studentSubs[assignments[1]._id.toString()] : null;
      const t3 = assignments[2] ? studentSubs[assignments[2]._id.toString()] : null;

      const uts = studentGrades['uts'];
      const uas = studentGrades['uas'];

      return {
        student: sIdStr,
        student_id: sIdStr,
        studentName: st.full_name,
        t1: t1 !== undefined ? t1 : null,
        t2: t2 !== undefined ? t2 : null,
        t3: t3 !== undefined ? t3 : null,
        uts: uts !== undefined ? uts : null,
        uas: uas !== undefined ? uas : null
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error getting class rekap grades:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil rekap nilai kelas' });
  }
};