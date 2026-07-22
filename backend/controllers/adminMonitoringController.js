const mongoose = require('mongoose');
const progressService = require('../services/progressService');
const ActivityLog = require('../models/ActivityLog');
const Material = require('../models/Material');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');

// ============================================================
// 1. MONITORING DATA SISWA & PREDIKSI RISIKO BELAJAR (EWS)
// ============================================================
exports.getStudentsMonitoring = async (req, res) => {
  try {
    const siswaCol = mongoose.connection.collection('users_siswa');
    const classCol = mongoose.connection.collection('classes');
    const ortuCol = mongoose.connection.collection('users_ortu');

    const { class_id, risk, search } = req.query;

    // Fetch classes for lookup
    const classes = await classCol.find({}).toArray();
    const classMap = {};
    classes.forEach((c) => {
      classMap[c._id.toString()] = c.name;
    });

    // Fetch parent users for lookup
    const parents = await ortuCol.find({}).toArray();
    const parentMap = {};
    parents.forEach((p) => {
      if (Array.isArray(p.children)) {
        p.children.forEach((childId) => {
          parentMap[childId.toString()] = {
            full_name: p.full_name,
            phone: p.phone,
            email: p.email,
          };
        });
      }
    });

    // Query students
    const query = {};
    if (class_id && mongoose.Types.ObjectId.isValid(class_id)) {
      query.class_id = new mongoose.Types.ObjectId(class_id);
    }
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { nis: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await siswaCol.find(query).toArray();

    // Compute progress and risk status for each student
    const studentList = await Promise.all(
      students.map(async (st) => {
        const studentIdStr = st._id.toString();
        const progress = await progressService.getStudentProgress(studentIdStr);
        const className = st.class_id
          ? classMap[st.class_id.toString()] || 'Tanpa Kelas'
          : 'Tanpa Kelas';
        const parentInfo = parentMap[studentIdStr] || null;

        return {
          _id: st._id,
          full_name: st.full_name || 'Tanpa Nama',
          nis: st.nis || '-',
          email: st.email || '-',
          phone: st.phone || '-',
          class_id: st.class_id || null,
          class_name: className,
          parent: parentInfo,
          avgScore: Math.round(progress.avgScore || 0),
          attendanceRate: Math.round(progress.attendanceRate || 0),
          materialCompletionRate: Math.round(progress.materialCompletionRate || 0),
          avgQuizScore: Math.round(progress.avgQuizScore || 0),
          risk: progress.risk || 'low',
          confidence: progress.confidence || 0,
          riskMessage: progress.message || '',
          riskColor: progress.color || 'green',
        };
      })
    );

    // Filter by risk if parameter provided
    let filteredStudents = studentList;
    if (risk && ['high', 'medium', 'low'].includes(risk.toLowerCase())) {
      filteredStudents = studentList.filter(
        (s) => s.risk.toLowerCase() === risk.toLowerCase()
      );
    }

    // Summary metrics
    const stats = {
      total_students: studentList.length,
      high_risk_count: studentList.filter((s) => s.risk === 'high').length,
      medium_risk_count: studentList.filter((s) => s.risk === 'medium').length,
      low_risk_count: studentList.filter((s) => s.risk === 'low').length,
    };

    return res.status(200).json({
      success: true,
      stats,
      data: filteredStudents,
    });
  } catch (error) {
    console.error('[AdminMonitoring] Error in getStudentsMonitoring:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data monitoring siswa.',
      error: error.message,
    });
  }
};

// GET SINGLE STUDENT MONITORING DETAIL
exports.getStudentDetailMonitoring = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'ID siswa tidak valid.' });
    }

    const siswaCol = mongoose.connection.collection('users_siswa');
    const classCol = mongoose.connection.collection('classes');
    const ortuCol = mongoose.connection.collection('users_ortu');

    const student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(studentId) });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    }

    const className = student.class_id
      ? (await classCol.findOne({ _id: student.class_id }))?.name || '-'
      : '-';

    const parent = await ortuCol.findOne({ children: new mongoose.Types.ObjectId(studentId) });

    const progress = await progressService.getStudentProgress(studentId);

    return res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        full_name: student.full_name,
        nis: student.nis,
        email: student.email,
        phone: student.phone,
        class_name: className,
        parent: parent ? { full_name: parent.full_name, phone: parent.phone, email: parent.email } : null,
      },
      progress,
    });
  } catch (error) {
    console.error('[AdminMonitoring] Error in getStudentDetailMonitoring:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail siswa.' });
  }
};

// ============================================================
// 2. PEMETAAN DATA GURU & SISWA BINAAN / KELAS YANG DIAMPU
// ============================================================
exports.getTeachersMonitoring = async (req, res) => {
  try {
    const guruCol = mongoose.connection.collection('users_guru');
    const siswaCol = mongoose.connection.collection('users_siswa');
    const classCol = mongoose.connection.collection('classes');
    const subjectCol = mongoose.connection.collection('subjects');
    const submissionCol = mongoose.connection.collection('submissions');

    const { search } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { nip: { $regex: search, $options: 'i' } },
        { teacher_code: { $regex: search, $options: 'i' } },
      ];
    }

    const teachers = await guruCol.find(query).toArray();
    const allSubjectDocs = await subjectCol.find({}).toArray();
    const allClassDocs = await classCol.find({}).toArray();

    const subjectMap = {};
    allSubjectDocs.forEach((s) => {
      subjectMap[s._id.toString()] = s.name;
    });

    const classMap = {};
    allClassDocs.forEach((c) => {
      classMap[c._id.toString()] = c.name;
    });

    // Gather teacher monitoring info
    const teacherList = await Promise.all(
      teachers.map(async (t) => {
        const teacherIdObj = t._id;
        const teacherIdStr = t._id.toString();

        // Subjects taught
        const assignedSubjects = (t.subjects || []).map(
          (sId) => subjectMap[sId.toString()] || 'Mata Pelajaran'
        );

        // Classes taught
        const assignedClassIds = (t.classes || []).map((cId) => cId.toString());
        const assignedClasses = assignedClassIds.map(
          (cId) => classMap[cId] || 'Kelas'
        );

        // Count students in teacher's assigned classes
        let totalStudentsTaught = 0;
        let studentsTaught = [];
        if (assignedClassIds.length > 0) {
          const classObjIds = assignedClassIds.map((id) => new mongoose.Types.ObjectId(id));
          const students = await siswaCol.find({ class_id: { $in: classObjIds } }).toArray();
          totalStudentsTaught = students.length;
          studentsTaught = students.map((st) => ({
            _id: st._id,
            full_name: st.full_name,
            nis: st.nis,
            class_name: classMap[st.class_id?.toString()] || '-',
          }));
        }

        // Materials uploaded count
        const totalMaterials = await Material.countDocuments({
          $or: [
            { teacher_id: teacherIdObj },
            { created_by: teacherIdObj },
          ],
        });

        // Assignments created count
        const assignments = await Assignment.find({
          $or: [
            { teacher_id: teacherIdObj },
            { created_by: teacherIdObj },
          ],
        });
        const totalAssignments = assignments.length;
        const assignmentIds = assignments.map((a) => a._id);

        // Submissions graded count
        let totalSubmissions = 0;
        let gradedSubmissions = 0;
        if (assignmentIds.length > 0) {
          totalSubmissions = await submissionCol.countDocuments({
            assignment_id: { $in: assignmentIds },
          });
          gradedSubmissions = await submissionCol.countDocuments({
            assignment_id: { $in: assignmentIds },
            score: { $ne: null },
          });
        }

        // Attendance sessions logged by teacher
        const totalAttendanceSessions = await Attendance.distinct('date', {
          teacher_id: teacherIdObj,
        });

        return {
          _id: t._id,
          full_name: t.full_name || 'Tanpa Nama',
          nip: t.nip || '-',
          teacher_code: t.teacher_code || '-',
          email: t.email || '-',
          phone: t.phone || '-',
          assigned_subjects: assignedSubjects,
          assigned_classes: assignedClasses,
          total_students_taught: totalStudentsTaught,
          students_taught_sample: studentsTaught.slice(0, 10),
          stats: {
            total_materials: totalMaterials,
            total_assignments: totalAssignments,
            total_submissions: totalSubmissions,
            graded_submissions: gradedSubmissions,
            grading_percentage: totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 100,
            attendance_sessions: totalAttendanceSessions.length,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      total_teachers: teacherList.length,
      data: teacherList,
    });
  } catch (error) {
    console.error('[AdminMonitoring] Error in getTeachersMonitoring:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data monitoring guru.',
      error: error.message,
    });
  }
};

// ============================================================
// 3. PEMANTAUAN AKTIVITAS GURU & LOG REAL-TIME
// ============================================================
exports.getTeacherActivities = async (req, res) => {
  try {
    const { teacher_name, limit = 50 } = req.query;

    const query = {
      $or: [
        { user_role: 'guru' },
        { user_role: 'users_guru' },
      ],
    };

    if (teacher_name) {
      query.user_name = { $regex: teacher_name, $options: 'i' };
    }

    const logs = await ActivityLog.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    // Summary of total activity logs per teacher
    const activitySummary = await ActivityLog.aggregate([
      {
        $match: {
          $or: [
            { user_role: 'guru' },
            { user_role: 'users_guru' },
          ],
        },
      },
      {
        $group: {
          _id: '$user_name',
          total_actions: { $sum: 1 },
          last_active: { $max: '$created_at' },
        },
      },
      { $sort: { last_active: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      summary: activitySummary,
      logs,
    });
  } catch (error) {
    console.error('[AdminMonitoring] Error in getTeacherActivities:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil log aktivitas guru.',
      error: error.message,
    });
  }
};
