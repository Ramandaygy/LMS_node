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
      {},
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
      {},
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

exports.getAlumniByYear = async (yearId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const objectId = new mongoose.Types.ObjectId(yearId);
  const alumni = await siswaCollection.find({
    role: 'alumni',
    graduated_year_id: objectId
  }).toArray();
  return alumni;
};

exports.promoteStudents = async (yearId) => {
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const classCollection = mongoose.connection.collection('classes');

  // 1. Dapatkan semua kelas
  const classes = await classCollection.find({ is_active: true }).toArray();
  const classesGrade8 = classes.filter(c => c.grade_level === 8);
  const classesGrade9 = classes.filter(c => c.grade_level === 9);

  // 2. Dapatkan semua siswa aktif
  const students = await siswaCollection.find({ role: 'siswa', status: 'active' }).toArray();

  // 3. Kelompokkan siswa berdasarkan kelas saat ini
  const studentsGrade7 = [];
  const studentsGrade8 = [];
  const studentsGrade9 = [];

  for (const student of students) {
    if (!student.class_id) continue;
    const currentClass = classes.find(c => c._id.toString() === student.class_id.toString());
    if (!currentClass) continue;

    if (currentClass.grade_level === 7) studentsGrade7.push(student);
    else if (currentClass.grade_level === 8) studentsGrade8.push(student);
    else if (currentClass.grade_level === 9) {
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