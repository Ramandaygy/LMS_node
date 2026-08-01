const AcademicYear =
  require('../models/AcademicYear');

exports.getAll = async () => {

  return await AcademicYear
    .find()
    .sort({
      created_at: -1
    });
};

exports.create = async (
  data
) => {
  if (data.start_date === '') data.start_date = null;
  if (data.end_date === '') data.end_date = null;

  if (data.is_active) {
    await AcademicYear.updateMany(
      { is_active: true },
      {
        $set: {
          is_active: false
        }
      }
    );
  }

  return await AcademicYear.create(
    data
  );
};

exports.update = async (
  id,
  data
) => {
  if (data.start_date === '') data.start_date = null;
  if (data.end_date === '') data.end_date = null;

  if (data.is_active) {
    await AcademicYear.updateMany(
      { is_active: true },
      {
        $set: {
          is_active: false
        }
      }
    );
  }

  return await AcademicYear.findByIdAndUpdate(
    id,
    data,
    {
      new: true
    }
  );
};

exports.delete = async (
  id
) => {

  return await AcademicYear.findByIdAndDelete(
    id
  );
};

exports.getCurrent =
  async () => {

    return await AcademicYear.findOne({
      is_active: true
    });
  };

const mongoose = require('mongoose');
const Grade = require('../models/Grade');

exports.getAlumniByYear = async (yearId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const objectId = new mongoose.Types.ObjectId(yearId);
  const alumni = await siswaCollection.find({
    role: 'alumni',
    graduated_year_id: objectId
  }).toArray();

  if (alumni.length === 0) return [];

  const studentIds = alumni.map(a => a._id);
  const allGrades = await Grade.find({ student: { $in: studentIds } });

  const gradesByStudent = {};
  allGrades.forEach(g => {
    const sId = g.student.toString();
    if (!gradesByStudent[sId]) {
      gradesByStudent[sId] = [];
    }
    gradesByStudent[sId].push(g.score);
  });

  return alumni.map(a => {
    const studentIdStr = a._id.toString();
    const scores = gradesByStudent[studentIdStr] || [];
    const averageScore = scores.length > 0
      ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
      : null;

    return {
      _id: a._id,
      full_name: a.full_name,
      nis: a.nis,
      graduated_from_class: a.graduated_from_class_name || a.graduated_from_class || '-',
      average_score: averageScore !== null ? averageScore : '-'
    };
  });
};

exports.promoteStudents = async (yearId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const classCollection = mongoose.connection.collection('classes');

  // 1. Dapatkan semua kelas
  const classes = await classCollection.find({ is_active: { $ne: false } }).toArray();
  const classesGrade8 = classes.filter(c => Number(c.grade_level) === 8);
  const classesGrade9 = classes.filter(c => Number(c.grade_level) === 9);

  // 2. Dapatkan semua siswa aktif (yang masih memiliki kelas dan role siswa)
  const students = await siswaCollection.find({ role: 'siswa', class_id: { $ne: null } }).toArray();

  // 3. Kelompokkan siswa berdasarkan kelas saat ini
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

  // Helper untuk acak array (Fisher-Yates)
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const bulkOperations = [];

  // 4. Proses Kelas 7 -> Kelas 8
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

  // 5. Proses Kelas 8 -> Kelas 9
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

  // 6. Proses Kelas 9 -> Alumni
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

exports.promoteSemester = async (currentYearId) => {
  const currentAY = await AcademicYear.findById(currentYearId);
  if (!currentAY) {
    throw new Error('Tahun ajaran tidak ditemukan');
  }

  // 1. Nonaktifkan tahun ajaran saat ini
  currentAY.is_active = false;
  await currentAY.save();

  // 2. Tentukan semester target
  const targetSemester = currentAY.semester.toLowerCase() === 'ganjil' ? 'Genap' : 'Ganjil';
  let targetAY = await AcademicYear.findOne({
    year: currentAY.year,
    semester: { $regex: new RegExp(`^${targetSemester}$`, 'i') }
  });

  // Jika belum ada tahun ajaran semester target, buat otomatis
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

  // 3. Nonaktifkan semua tahun ajaran lainnya
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