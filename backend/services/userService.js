const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ======================================
// DYNAMIC COLLECTION GETTER
// ======================================
const getCollection = (name) => mongoose.connection.collection(name);

// ======================================
// GET ALL USERS
// ======================================
exports.getAllUsers = async () => {
  const [siswa, guru, admin, ortu] = await Promise.all([
    getCollection('users_siswa').find({}).toArray(),
    getCollection('users_guru').find({}).toArray(),
    getCollection('users_admin').find({}).toArray(),
    getCollection('users_ortu').find({}).toArray()
  ]);

  return [
    ...siswa,
    ...guru,
    ...admin,
    ...ortu
  ];
};

// ======================================
// GET USER BY ID
// ======================================
exports.getUserById = async (id) => {
  const objectId = new mongoose.Types.ObjectId(id);

  let user = await getCollection('users_siswa').findOne({ _id: objectId });
  if (!user) user = await getCollection('users_guru').findOne({ _id: objectId });
  if (!user) user = await getCollection('users_admin').findOne({ _id: objectId });
  if (!user) user = await getCollection('users_ortu').findOne({ _id: objectId });

  return user;
};

// ======================================
// GET STUDENT BY ID WITH PARENT & CLASS
// ======================================
exports.getStudentByIdWithParent = async (id) => {
  const objectId = new mongoose.Types.ObjectId(id);
  
  // Ambil data siswa
  const student = await getCollection('users_siswa').findOne({ _id: objectId });
  if (!student) return null;

  // Ambil data kelas
  let classData = null;
  if (student.class_id) {
    try {
      classData = await getCollection('classes').findOne({ 
        _id: new mongoose.Types.ObjectId(student.class_id) 
      });
    } catch (e) {
      console.error('Error fetching class:', e);
    }
  }

  // Ambil data orang tua jika ada parent_id
  let parentData = null;
  if (student.parent_id) {
    try {
      parentData = await getCollection('users_ortu').findOne({ 
        _id: new mongoose.Types.ObjectId(student.parent_id) 
      });
    } catch (e) {
      console.error('Error fetching parent:', e);
    }
  }

  // Gabungkan data
  return {
    ...student,
    class_name: classData?.name || student.class_name || 'Belum Diatur',
    class: classData || null,
    parent: parentData || null,
    parent_name: parentData?.full_name || student.parent_name || 'Belum dihubungkan',
    parent_phone: parentData?.phone || student.parent_phone || 'Belum ada',
    parent_job: parentData?.pekerjaan || student.pekerjaan_ortu || '-',
    parent_email: parentData?.email || '-'
  };
};

// ======================================
// GET USERS BY ROLE
// ======================================
exports.getUsersByRole = async (role) => {
  let users = [];

  switch (role) {
    case 'siswa':
      const siswaFromColl = await getCollection('users_siswa').aggregate([
        { $lookup: { from: 'classes', localField: 'class_id', foreignField: '_id', as: 'class_details' } },
        { $lookup: { from: 'users_ortu', localField: 'parent_id', foreignField: '_id', as: 'parent_details' } },
        {
          $addFields: {
            class_name: { $ifNull: [{ $arrayElemAt: ['$class_details.name', 0] }, '$class_name'] },
            parent: { $arrayElemAt: ['$parent_details', 0] }
          }
        },
        {
          $project: {
            class_details: 0,
            parent_details: 0
          }
        }
      ]).toArray();

      const mainUsersSiswa = await getCollection('users').find({ role: 'siswa' }).toArray();
      
      const allSiswaMap = new Map();
      [...siswaFromColl, ...mainUsersSiswa].forEach(s => {
        if (s && s._id) {
          allSiswaMap.set(s._id.toString(), s);
        }
      });
      users = Array.from(allSiswaMap.values());
      break;

    case 'guru':
      users = await getCollection('users_guru').find({}).toArray();
      break;

    case 'admin':
      users = await getCollection('users_admin').find({}).toArray();
      break;

    case 'ortu':
      users = await getCollection('users_ortu').find({}).toArray();
      if (users.length) {
        const parentIds = users.map(u => u._id);
        const activeStudents = await getCollection('users_siswa').find({
          parent_id: { $in: parentIds }
        }).toArray();

        const studentsByParent = {};
        activeStudents.forEach(s => {
          if (s.parent_id) {
            const pIdStr = s.parent_id.toString();
            if (!studentsByParent[pIdStr]) {
              studentsByParent[pIdStr] = [];
            }
            studentsByParent[pIdStr].push({
              _id: s._id,
              full_name: s.full_name,
              nis: s.nis
            });
          }
        });

        users = users.map(u => ({
          ...u,
          children: studentsByParent[u._id.toString()] || []
        }));
      }
      break;

    default:
      return [];
  }

  const subjects = await getCollection('subjects').find({}).toArray();
  const classes = await getCollection('classes').find({}).toArray();

  return users.map(user => {
    let subjectNames = [];
    if (Array.isArray(user.subjects)) {
      subjectNames = user.subjects.map(id => {
        if (!id) return '-';
        try {
          const subject = subjects.find(
            s => s && s._id && s._id.toString() === id.toString()
          );
          return subject?.name || '-';
        } catch (e) {
          return '-';
        }
      });
    }

    let classNames = [];
    if (Array.isArray(user.classes)) {
      classNames = user.classes.map(id => {
        if (!id) return '-';
        try {
          const kelas = classes.find(
            c => c && c._id && c._id.toString() === id.toString()
          );
          return kelas?.name || '-';
        } catch (e) {
          return '-';
        }
      });
    }

    let className = '-';
    if (user.class_id) {
      try {
        const kelas = classes.find(
          c => c && c._id && c._id.toString() === user.class_id.toString()
        );
        className = kelas?.name || '-';
      } catch (e) {
        className = '-';
      }
    }

    return {
      ...user,
      subjects: subjectNames,
      classes: classNames,
      subject_ids: Array.isArray(user.subjects) ? user.subjects : [],
      class_ids: Array.isArray(user.classes) ? user.classes : [],
      class_name: className,
      is_active: user.is_active !== undefined ? user.is_active : true,
    };
  });
};

// ======================================
// CREATE USER
// ======================================
exports.createUser = async (userData) => {
  let collection;

  switch (userData.role) {
    case 'siswa':
      collection = getCollection('users_siswa');
      break;
    case 'guru':
      collection = getCollection('users_guru');
      break;
    case 'admin':
      collection = getCollection('users_admin');
      break;
    case 'ortu':
      collection = getCollection('users_ortu');
      break;
    default:
      throw new Error('Role tidak valid');
  }

  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, 10);
  }

  if (userData.children && Array.isArray(userData.children)) {
    userData.children = userData.children.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        return id;
      }
    });
  }

  if (userData.class_id) {
    try {
      userData.class_id = new mongoose.Types.ObjectId(userData.class_id);
    } catch (err) {}
  }
  
  if (userData.parent_id) {
    try {
      userData.parent_id = new mongoose.Types.ObjectId(userData.parent_id);
    } catch (err) {}
  }

  const result = await collection.insertOne({
    ...userData,
    is_active: userData.is_active !== undefined ? userData.is_active : true,
  });

  return result;
};

// ======================================
// UPDATE USER
// ======================================
exports.updateUser = async (id, updateData) => {
  const objectId = new mongoose.Types.ObjectId(id);
  const collections = [
    getCollection('users_siswa'),
    getCollection('users_guru'),
    getCollection('users_admin'),
    getCollection('users_ortu')
  ];

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  } else if (updateData.password === '') {
    delete updateData.password;
  }

  if (updateData.children && Array.isArray(updateData.children)) {
    updateData.children = updateData.children.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        return id;
      }
    });
  }

  if (updateData.class_id) {
    try {
      updateData.class_id = new mongoose.Types.ObjectId(updateData.class_id);
    } catch (err) {}
  }

  if (updateData.parent_id) {
    try {
      updateData.parent_id = new mongoose.Types.ObjectId(updateData.parent_id);
    } catch (err) {}
  }

  for (const collection of collections) {
    const user = await collection.findOne({ _id: objectId });
    if (user) {
      await collection.updateOne(
        { _id: objectId },
        { $set: updateData }
      );
      return true;
    }
  }

  throw new Error('User tidak ditemukan');
};

// ======================================
// DELETE USER
// ======================================
exports.deleteUser = async (id) => {
  const objectId = new mongoose.Types.ObjectId(id);
  const collections = [
    getCollection('users_siswa'),
    getCollection('users_guru'),
    getCollection('users_admin'),
    getCollection('users_ortu')
  ];

  for (const collection of collections) {
    const user = await collection.findOne({ _id: objectId });
    if (user) {
      await collection.deleteOne({ _id: objectId });
      return true;
    }
  }

  throw new Error('User tidak ditemukan');
};