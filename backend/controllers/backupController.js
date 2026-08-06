const mongoose = require('mongoose');

// Collections to backup and restore
const TARGET_COLLECTIONS = [
  'users_siswa',
  'users_guru',
  'users_admin',
  'users_ortu',
  'classes',
  'subjects',
  'schedules',
  'academic_years',
  'assignments',
  'submissions',
  'attendances',
  'grades',
  'materials',
  'settings',
  'activitylogs'
];

exports.exportBackup = async (req, res) => {
  try {
    const backupData = {};
    const db = mongoose.connection.db;

    for (const collName of TARGET_COLLECTIONS) {
      const collection = db.collection(collName);
      const docs = await collection.find({}).toArray();
      backupData[collName] = docs;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="lms_database_backup.json"');
    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Export backup error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengexport backup data: ' + err.message });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File backup tidak ditemukan' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const backupData = JSON.parse(fileContent);

    const db = mongoose.connection.db;

    for (const collName of TARGET_COLLECTIONS) {
      if (backupData[collName] && Array.isArray(backupData[collName])) {
        const collection = db.collection(collName);
        
        // 1. Clear existing data in collection
        await collection.deleteMany({});

        // 2. Insert backup documents if any
        if (backupData[collName].length > 0) {
          // Convert string _id and dates back to ObjectIds and Dates where needed
          const docsToInsert = backupData[collName].map(doc => {
            const parsedDoc = { ...doc };
            
            // Map _id
            if (parsedDoc._id) {
              parsedDoc._id = new mongoose.Types.ObjectId(parsedDoc._id);
            }
            
            // Convert specific reference IDs in models
            if (parsedDoc.class_id) parsedDoc.class_id = new mongoose.Types.ObjectId(parsedDoc.class_id);
            if (parsedDoc.parent_id) parsedDoc.parent_id = new mongoose.Types.ObjectId(parsedDoc.parent_id);
            if (parsedDoc.homeroom_teacher) parsedDoc.homeroom_teacher = new mongoose.Types.ObjectId(parsedDoc.homeroom_teacher);
            if (parsedDoc.academic_year_id) parsedDoc.academic_year_id = new mongoose.Types.ObjectId(parsedDoc.academic_year_id);
            if (parsedDoc.teacher_id) parsedDoc.teacher_id = new mongoose.Types.ObjectId(parsedDoc.teacher_id);
            if (parsedDoc.subject_id) parsedDoc.subject_id = new mongoose.Types.ObjectId(parsedDoc.subject_id);
            
            if (Array.isArray(parsedDoc.subjects)) {
              parsedDoc.subjects = parsedDoc.subjects.map(id => new mongoose.Types.ObjectId(id));
            }
            if (Array.isArray(parsedDoc.classes)) {
              parsedDoc.classes = parsedDoc.classes.map(id => new mongoose.Types.ObjectId(id));
            }
            if (Array.isArray(parsedDoc.children)) {
              parsedDoc.children = parsedDoc.children.map(id => new mongoose.Types.ObjectId(id));
            }

            // Dates conversion
            if (parsedDoc.created_at) parsedDoc.created_at = new Date(parsedDoc.created_at);
            if (parsedDoc.updated_at) parsedDoc.updated_at = new Date(parsedDoc.updated_at);
            if (parsedDoc.createdAt) parsedDoc.createdAt = new Date(parsedDoc.createdAt);
            if (parsedDoc.updatedAt) parsedDoc.updatedAt = new Date(parsedDoc.updatedAt);
            if (parsedDoc.lastLogin) parsedDoc.lastLogin = new Date(parsedDoc.lastLogin);
            
            return parsedDoc;
          });

          await collection.insertMany(docsToInsert);
        }
      }
    }

    // Log the restore event
    const { logActivity } = require('../utils/activityLogger');
    await logActivity(req, 'DATABASE_RESTORE', 'Database successfully restored from JSON backup');

    return res.status(200).json({ success: true, message: 'Database berhasil direstore!' });
  } catch (err) {
    console.error('Restore backup error:', err);
    return res.status(500).json({ success: false, message: 'Gagal merestore database: ' + err.message });
  }
};
