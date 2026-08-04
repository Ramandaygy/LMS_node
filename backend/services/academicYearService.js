const AcademicYear = require('../models/AcademicYear');
const mongoose = require('mongoose');
const Grade = require('../models/Grade');

exports.getAll = async () => {
  return await AcademicYear.find().sort({ created_at: -1 });
};

exports.create = async (data) => {
  if (data.start_date === '') data.start_date = null;
  if (data.end_date === '') data.end_date = null;

  if (data.is_active) {
    await AcademicYear.updateMany(
      { is_active: true },
      { $set: { is_active: false } }
    );
  }

  return await AcademicYear.create(data);
};

exports.update = async (id, data) => {
  if (data.start_date === '') data.start_date = null;
  if (data.end_date === '') data.end_date = null;

  if (data.is_active) {
    await AcademicYear.updateMany(
      { is_active: true },
      { $set: { is_active: false } }
    );
  }

  return await AcademicYear.findByIdAndUpdate(id, data, { new: true });
};

exports.delete = async (id) => {
  return await AcademicYear.findByIdAndDelete(id);
};

exports.getCurrent = async () => {
  return await AcademicYear.findOne({ is_active: true });
};

exports.getAlumniByYear = async (yearId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const objectId = new mongoose.Types.ObjectId(yearId);
  const alumni = await siswaCollection.find({
    role: 'alumni',
    graduated_year_id: objectId
  }).toArray();

  if (alumni.length === 0) return [];

  const studentIds = alumni.map(a => a._id);
  
  // Coba cari nilai dari collection grades atau grade
  let allGrades = [];
  try {
    const gradeCollection = mongoose.connection.collection('grades');
    allGrades = await gradeCollection.find({ 
      student_id: { $in: studentIds } 
    }).toArray();
  } catch (err) {
    console.warn('Grades collection not found, trying fallback:', err.message);
  }

  // Fallback: coba dari model Grade
  if (allGrades.length === 0) {
    try {
      const gradesFromModel = await Grade.find({ student: { $in: studentIds } });
      allGrades = gradesFromModel.map(g => ({
        student_id: g.student,
        score: g.score || g.final_score || 0
      }));
    } catch (err2) {
      console.warn('Grade model fallback failed:', err2.message);
    }
  }

  const gradesByStudent = {};
  allGrades.forEach(g => {
    const sId = (g.student_id || g.student || '').toString();
    if (!sId) return;
    if (!gradesByStudent[sId]) {
      gradesByStudent[sId] = [];
    }
    const score = g.score || g.final_score || g.nilai_akhir || 0;
    gradesByStudent[sId].push(Number(score));
  });

  return alumni.map(a => {
    const studentIdStr = a._id.toString();
    const scores = gradesByStudent[studentIdStr] || [];
    let averageScore = '-';
    if (scores.length > 0) {
      const total = scores.reduce((sum, s) => sum + s, 0);
      averageScore = Math.round((total / scores.length) * 10) / 10;
    }

    return {
      _id: a._id,
      full_name: a.full_name,
      nis: a.nis || '-',
      nisn: a.nisn || '-',
      graduated_from_class: a.graduated_from_class_name || a.graduated_from_class || '-',
      average_score: averageScore
    };
  });
};

exports.promoteStudents = async (yearId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const classCollection = mongoose.connection.collection('classes');

  const classes = await classCollection.find({ is_active: { $ne: false } }).toArray();
  const classesGrade8 = classes.filter(c => Number(c.grade_level) === 8);
  const classesGrade9 = classes.filter(c => Number(c.grade_level) === 9);

  const students = await siswaCollection.find({ role: 'siswa', class_id: { $ne: null } }).toArray();

  const studentsGrade7 = [];
  const studentsGrade8 = [];
  const studentsGrade9 = [];

  for (const student of students) {
    const studentClassId = student.class_id?._id || student.class_id;
    if (!studentClassId) continue;
    const currentClass = classes.find(c => c._id.toString() === studentClassId.toString());
    if (!currentClass) continue;

    const currentGrade = Number(currentClass.grade_level);
    if (currentGrade === 7) studentsGrade7.push(student);
    else if (currentGrade === 8) studentsGrade8.push(student);
    else if (currentGrade === 9) {
      student.graduated_from_class_name = currentClass.name;
      studentsGrade9.push(student);
    }
  }

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const bulkOperations = [];

  if (classesGrade8.length > 0 && studentsGrade7.length > 0) {
    const shuffled7 = shuffleArray([...studentsGrade7]);
    shuffled7.forEach((student, index) => {
      const targetClass = classesGrade8[index % classesGrade8.length];
      bulkOperations.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { class_id: targetClass._id } }
        }
      });
    });
  }

  if (classesGrade9.length > 0 && studentsGrade8.length > 0) {
    const shuffled8 = shuffleArray([...studentsGrade8]);
    shuffled8.forEach((student, index) => {
      const targetClass = classesGrade9[index % classesGrade9.length];
      bulkOperations.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { class_id: targetClass._id } }
        }
      });
    });
  }

  const objectId = new mongoose.Types.ObjectId(yearId);
  studentsGrade9.forEach(student => {
    bulkOperations.push({
      updateOne: {
        filter: { _id: student._id },
        update: { 
          $set: { 
            role: 'alumni', 
            is_active: false, 
            status: 'inactive',
            class_id: null,
            graduated_year_id: objectId,
            graduated_from_class: student.graduated_from_class_name,
            graduated_from_class_name: student.graduated_from_class_name
          } 
        }
      }
    });
  });

  if (bulkOperations.length > 0) {
    await siswaCollection.bulkWrite(bulkOperations);
  }

  return {
    promotedTo8: studentsGrade7.length,
    promotedTo9: studentsGrade8.length,
    graduated: studentsGrade9.length
  };
};

// ============================================================
// 🔥 PROMOTE WIZARD - Sudah Disesuaikan
// ============================================================
exports.promoteWizard = async (yearId, params) => {
  const { source_class_id, target_class_id, student_ids, is_graduated } = params;
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const classCollection = mongoose.connection.collection('classes');
  const objectId = new mongoose.Types.ObjectId(yearId);
  
  // 🔥 Ambil nama kelas asal dari database (BUKAN HARDCODE)
  const sourceClass = await classCollection.findOne({ _id: new mongoose.Types.ObjectId(source_class_id) });
  const sourceClassName = sourceClass?.name || 'Kelas Asal';

  // 🔥 Ambil nama kelas tujuan dari database (BUKAN HARDCODE)
  let targetClassName = 'ALUMNI';
  if (!is_graduated && target_class_id) {
    const targetClass = await classCollection.findOne({ _id: new mongoose.Types.ObjectId(target_class_id) });
    targetClassName = targetClass?.name || 'Kelas Tujuan';
  }

  const bulkOperations = [];
  const promotedStudents = [];

  for (const studentId of student_ids) {
    const student = await siswaCollection.findOne({ _id: new mongoose.Types.ObjectId(studentId) });
    if (!student) continue;

    promotedStudents.push({
      id: studentId,
      name: student.full_name,
      nis: student.nis || '-'
    });

    if (is_graduated) {
      bulkOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(studentId) },
          update: { 
            $set: { 
              role: 'alumni', 
              is_active: false, 
              status: 'inactive',
              class_id: null,
              graduated_year_id: objectId,
              graduated_from_class_name: sourceClassName,
              graduated_from_class: sourceClassName
            } 
          }
        }
      });
    } else {
      bulkOperations.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(studentId) },
          update: { 
            $set: { 
              class_id: new mongoose.Types.ObjectId(target_class_id),
              graduated_from_class_name: null,
              graduated_year_id: null
            } 
          }
        }
      });
    }
  }

  if (bulkOperations.length > 0) {
    await siswaCollection.bulkWrite(bulkOperations);
  }

  return {
    promoted: bulkOperations.length,
    source_class: sourceClassName,
    target_class: targetClassName,
    is_graduated: is_graduated,
    students: promotedStudents,
    message: `${bulkOperations.length} siswa berhasil dipromosikan dari ${sourceClassName} ke ${is_graduated ? 'ALUMNI' : targetClassName}`
  };
};

exports.promoteSemester = async (currentYearId) => {
  const currentAY = await AcademicYear.findById(currentYearId);
  if (!currentAY) {
    throw new Error('Tahun ajaran tidak ditemukan');
  }

  currentAY.is_active = false;
  await currentAY.save();

  const targetSemester = currentAY.semester.toLowerCase() === 'ganjil' ? 'Genap' : 'Ganjil';
  let targetAY = await AcademicYear.findOne({
    year: currentAY.year,
    semester: { $regex: new RegExp(`^${targetSemester}$`, 'i') }
  });

  if (!targetAY) {
    targetAY = await AcademicYear.create({
      year: currentAY.year,
      semester: targetSemester,
      is_active: true,
      start_date: new Date(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 6))
    });
  } else {
    targetAY.is_active = true;
    await targetAY.save();
  }

  await AcademicYear.updateMany(
    { _id: { $ne: targetAY._id } },
    { $set: { is_active: false } }
  );

  return {
    previous_semester: currentAY.semester,
    active_semester: targetAY.semester,
    year: targetAY.year
  };
};

// Drop the old single unique index if it exists, to allow year + semester duplicates
mongoose.connection.once('open', async () => {
  try {
    const collection = mongoose.connection.collection('academic_years');
    const indexes = await collection.indexes();
    if (indexes.some(idx => idx.name === 'year_1')) {
      await collection.dropIndex('year_1');
      console.log('Successfully dropped old single unique index year_1 from academic_years');
    }
  } catch (err) {
    console.error('Error dropping old index year_1:', err);
  }
});