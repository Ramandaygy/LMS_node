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
          const classObjIds = assignedClassIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
          const classNames = assignedClasses.filter((c) => c !== 'Kelas');

          const students = await siswaCol.find({
            is_active: { $ne: false },
            $or: [
              { class_id: { $in: [...classObjIds, ...assignedClassIds] } },
              { class_id: { $in: classNames } },
              { class_name: { $in: classNames } }
            ]
          }).toArray();

          totalStudentsTaught = students.length;
          studentsTaught = students.map((st) => ({
            _id: st._id,
            full_name: st.full_name,
            nis: st.nis,
            class_name: classMap[st.class_id?.toString()] || st.class_name || '-',
          }));
        }

        // Materials uploaded count
        const totalMaterials = await Material.countDocuments({
          $or: [
            { teacher: teacherIdObj },
            { teacher: teacherIdStr },
            { teacher_id: teacherIdObj },
            { teacher_id: teacherIdStr },
            { created_by: teacherIdObj },
            { created_by: teacherIdStr },
          ],
        });

        // Assignments created count
        const assignments = await Assignment.find({
          $or: [
            { teacher: teacherIdObj },
            { teacher: teacherIdStr },
            { teacher_id: teacherIdObj },
            { teacher_id: teacherIdStr },
            { created_by: teacherIdObj },
            { created_by: teacherIdStr },
          ],
        });

        const totalAssignments = assignments.length;
        const assignmentIds = assignments.map((a) => a._id);
        const assignmentIdStrings = assignments.map((a) => a._id.toString());

        // Submissions graded count
        let totalSubmissions = 0;
        let gradedSubmissions = 0;
        if (assignmentIds.length > 0) {
          totalSubmissions = await submissionCol.countDocuments({
            assignment_id: { $in: [...assignmentIds, ...assignmentIdStrings] },
          });
          gradedSubmissions = await submissionCol.countDocuments({
            assignment_id: { $in: [...assignmentIds, ...assignmentIdStrings] },
            score: { $ne: null },
          });
        }

        // Attendance sessions logged by teacher
        const totalAttendanceSessions = await Attendance.distinct('date', {
          $or: [
            { teacher: teacherIdObj },
            { teacher: teacherIdStr },
            { teacher_id: teacherIdObj },
            { teacher_id: teacherIdStr },
          ]
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
          total_materials: totalMaterials,
          total_assignments: totalAssignments,
          total_submissions: totalSubmissions,
          graded_submissions: gradedSubmissions,
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

// ============================================================
// 4. LEGER NILAI AKADEMIK KELAS (MODEL BOBOT 2 : 1 : 1)
// ============================================================

// Helper function to build Leger matrix
async function computeLegerData(classId) {
  const siswaCol = mongoose.connection.collection('users_siswa');
  const classCol = mongoose.connection.collection('classes');
  const subjectCol = mongoose.connection.collection('subjects');
  const submissionsCol = mongoose.connection.collection('submissions');
  const assignmentsCol = mongoose.connection.collection('assignments');
  const gradesCol = mongoose.connection.collection('grades');
  const attendancesCol = mongoose.connection.collection('attendances');
  const guruCol = mongoose.connection.collection('users_guru');

  const objClassId = new mongoose.Types.ObjectId(classId);

  // 1. Get Class info & Homeroom teacher
  const classDoc = await classCol.findOne({ _id: objClassId });
  if (!classDoc) throw new Error('Kelas tidak ditemukan');

  let homeroomTeacherName = 'Belum Diatur';
  if (classDoc.homeroom_teacher) {
    const hr = await guruCol.findOne({ _id: classDoc.homeroom_teacher });
    if (hr) homeroomTeacherName = hr.full_name;
  }

  // 2. Get active subjects
  const subjects = await subjectCol.find({ is_active: { $ne: false } }).toArray();

  // 3. Get students in this class
  const students = await siswaCol.find({ class_id: objClassId }).sort({ full_name: 1 }).toArray();

  // Pre-fetch all assignments for quick mapping
  const allAssignments = await assignmentsCol.find({}).toArray();
  const assignmentMap = {};
  allAssignments.forEach((a) => {
    assignmentMap[a._id.toString()] = a;
  });

  // Calculate scores for each student
  const studentLegerList = await Promise.all(
    students.map(async (st) => {
      const studentIdObj = st._id;
      const studentIdStr = st._id.toString();

      // Attendance rate
      const attendances = await attendancesCol.find({ student_id: { $in: [studentIdObj, studentIdStr] } }).toArray();
      const totalAtt = attendances.length;
      const presentAtt = attendances.filter((a) => {
        const st = (a.status || '').toLowerCase();
        return st === 'hadir' || st === 'present';
      }).length;
      const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

      let totalNASum = 0;
      let subjectCount = 0;
      const subjectGrades = {};

      for (const sub of subjects) {
        const subIdStr = sub._id.toString();

        // Find submissions for assignments of this subject
        const subAssignments = allAssignments.filter((a) => {
          const sId = (a.subject || a.subject_id || a.subjectId)?.toString();
          return sId === subIdStr;
        });

        const subAssignmentIds = subAssignments.map((a) => a._id);
        const subAssignmentIdStrings = subAssignments.map((a) => a._id.toString());

        const submissions = await submissionsCol
          .find({
            $or: [
              { student_id: studentIdObj },
              { student_id: studentIdStr }
            ],
            assignment_id: { $in: [...subAssignmentIds, ...subAssignmentIdStrings] },
            score: { $ne: null },
          })
          .toArray();

        let totalTugasScore = 0;
        let totalTugasMax = 0;
        submissions.forEach((s) => {
          const assign = assignmentMap[s.assignment_id.toString()] || { max_score: 100, total_score: 100 };
          totalTugasScore += s.score;
          totalTugasMax += assign.max_score || assign.total_score || 100;
        });

        // Compute NH (Nilai Harian / Rata-rata Tugas)
        const hasNH = totalTugasMax > 0;
        const NH = hasNH ? Math.round((totalTugasScore / totalTugasMax) * 100) : null;

        // Get PTS & PAS from Grade collection
        const ptsGrade = await gradesCol.findOne({
          student: { $in: [studentIdObj, studentIdStr] },
          subject: { $in: [sub._id, sub._id.toString()] },
          type: 'uts',
        });
        const pasGrade = await gradesCol.findOne({
          student: { $in: [studentIdObj, studentIdStr] },
          subject: { $in: [sub._id, sub._id.toString()] },
          type: 'uas',
        });

        const PTS = ptsGrade ? ptsGrade.score : null;
        const PAS = pasGrade ? pasGrade.score : null;

        // Formula 1 : 1 : 1 -> NA = (NH + PTS + PAS) / 3
        let NA = null;
        if (NH !== null || PTS !== null || PAS !== null) {
          const nhVal = NH !== null ? NH : (PTS !== null ? PTS : (PAS !== null ? PAS : 0));
          const ptsVal = PTS !== null ? PTS : nhVal;
          const pasVal = PAS !== null ? PAS : nhVal;
          NA = Math.round((nhVal + ptsVal + pasVal) / 3);
        }

        let predikat = '-';
        if (NA !== null) {
          if (NA >= 88) predikat = 'A';
          else if (NA >= 78) predikat = 'B';
          else if (NA >= 75) predikat = 'C';
          else predikat = 'D';
        }

        subjectGrades[subIdStr] = {
          subject_name: sub.name,
          NH: NH !== null ? NH : '-',
          PTS: PTS !== null ? PTS : '-',
          PAS: PAS !== null ? PAS : '-',
          NA: NA !== null ? NA : '-',
          predikat,
        };

        if (NA !== null) {
          totalNASum += NA;
          subjectCount++;
        }
      }

      const avgRapor = subjectCount > 0 ? Math.round(totalNASum / subjectCount) : 0;

      return {
        _id: st._id,
        full_name: st.full_name,
        nis: st.nis || '-',
        subjectGrades,
        totalNASum,
        avgRapor,
        attendanceRate,
      };
    })
  );

  // Compute Ranking (sort descending by avgRapor)
  const sortedStudents = [...studentLegerList].sort((a, b) => b.avgRapor - a.avgRapor);
  sortedStudents.forEach((st, idx) => {
    st.rank = idx + 1;
  });

  return {
    class_info: {
      _id: classDoc._id,
      name: classDoc.name,
      grade_level: classDoc.grade_level,
      homeroom_teacher: homeroomTeacherName,
    },
    subjects: subjects.map((s) => ({ _id: s._id, name: s.name, code: s.code })),
    students: sortedStudents,
  };
}

exports.getLegerByClass = async (req, res) => {
  try {
    const { class_id } = req.query;
    if (!class_id || !mongoose.Types.ObjectId.isValid(class_id)) {
      return res.status(400).json({ success: false, message: 'ID Kelas wajib diisi dan valid.' });
    }

    const legerData = await computeLegerData(class_id);
    return res.status(200).json({ success: true, ...legerData });
  } catch (error) {
    console.error('[AdminMonitoring] Error in getLegerByClass:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal menghitung leger nilai kelas.',
    });
  }
};

exports.exportLegerExcel = async (req, res) => {
  try {
    const { class_id } = req.query;
    if (!class_id || !mongoose.Types.ObjectId.isValid(class_id)) {
      return res.status(400).json({ success: false, message: 'ID Kelas wajib diisi dan valid.' });
    }

    const legerData = await computeLegerData(class_id);
    const ExcelJS = require('exceljs');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Leger ${legerData.class_info.name}`);

    // Header Title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `LEGER NILAI AKADEMIK SISWA - KELAS ${legerData.class_info.name.toUpperCase()}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Wali Kelas: ${legerData.class_info.homeroom_teacher}`;
    worksheet.getCell('A2').font = { size: 11, italic: true };

    // Build Table Header
    const headerRow1 = ['No', 'NIS', 'Nama Siswa'];
    const headerRow2 = ['', '', ''];

    legerData.subjects.forEach((sub) => {
      headerRow1.push(sub.name, '', '', '');
      headerRow2.push('NH', 'PTS', 'PAS', 'NA');
    });

    headerRow1.push('Rata-Rata Rapor', 'Presensi', 'Ranking');
    headerRow2.push('Nilai Akhir', '% Kehadiran', 'Peringkat');

    worksheet.addRow([]);
    worksheet.addRow(headerRow1);
    worksheet.addRow(headerRow2);

    // Style table headers
    const row4 = worksheet.getRow(4);
    const row5 = worksheet.getRow(5);
    [row4, row5].forEach((r) => {
      r.font = { bold: true, color: { argb: 'FFFFFF' } };
      r.alignment = { horizontal: 'center', vertical: 'middle' };
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
      });
    });

    // Populate Student Rows
    legerData.students.forEach((st, idx) => {
      const row = [idx + 1, st.nis, st.full_name];

      legerData.subjects.forEach((sub) => {
        const sg = st.subjectGrades[sub._id.toString()] || { NH: '-', PTS: '-', PAS: '-', NA: '-' };
        row.push(sg.NH, sg.PTS, sg.PAS, sg.NA);
      });

      row.push(st.avgRapor, `${st.attendanceRate}%`, st.rank);
      worksheet.addRow(row);
    });

    // Send File Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Leger_Nilai_${legerData.class_info.name.replace(/\s+/g, '_')}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[AdminMonitoring] Error in exportLegerExcel:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengekspor Leger ke Excel.' });
  }
};

