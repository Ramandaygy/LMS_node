const Schedule = require('../models/Schedule');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Sinkronisasi array 'classes' dan 'subjects' pada data guru
 * berdasarkan seluruh jadwal mengajar guru tersebut yang terdaftar di database.
 */
async function syncTeacherClassesAndSubjects(teacherIds) {
  if (!teacherIds || teacherIds.length === 0) return;
  
  try {
    const guruCollection = mongoose.connection.collection('users_guru');
    
    // Fetch all schedules for these teachers in a single query
    const objectIds = teacherIds.filter(id => id && mongoose.Types.ObjectId.isValid(id.toString())).map(id => new mongoose.Types.ObjectId(id.toString()));
    const allSchedules = await Schedule.find({ teacher_id: { $in: objectIds } });
    
    // Group schedules by teacher
    const schedulesByTeacher = {};
    allSchedules.forEach(s => {
      if (s.teacher_id) {
        const tIdStr = s.teacher_id.toString();
        if (!schedulesByTeacher[tIdStr]) {
          schedulesByTeacher[tIdStr] = [];
        }
        schedulesByTeacher[tIdStr].push(s);
      }
    });

    const bulkOps = [];
    for (const tid of teacherIds) {
      if (!tid) continue;
      const tidStr = tid.toString();
      const objTid = new mongoose.Types.ObjectId(tidStr);
      const schedules = schedulesByTeacher[tidStr] || [];
      
      const uniqueClasses = [...new Set(schedules.map(s => s.class_id ? s.class_id.toString() : null).filter(Boolean))];
      const classObjectIds = uniqueClasses.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      
      const uniqueSubjects = [...new Set(schedules.map(s => s.subject_id ? s.subject_id.toString() : null).filter(Boolean))];
      const subjectObjectIds = uniqueSubjects.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      
      bulkOps.push({
        updateOne: {
          filter: { _id: objTid },
          update: {
            $set: {
              classes: classObjectIds,
              subjects: subjectObjectIds
            }
          }
        }
      });
    }

    if (bulkOps.length > 0) {
      await guruCollection.bulkWrite(bulkOps);
    }
    console.log(`[ML/Sync] Berhasil sinkronisasi kelas & mapel untuk ${teacherIds.length} guru.`);
  } catch (err) {
    console.error('[ML/Sync] Gagal sinkronisasi data kelas & mapel guru:', err);
  }
}

/**
 * Sinkronisasi seluruh guru dengan seluruh jadwal di database.
 * Dipanggil saat startup server.
 */
exports.syncAllTeachers = async () => {
  try {
    const guruCollection = mongoose.connection.collection('users_guru');
    const teachers = await guruCollection.find({}, { projection: { _id: 1 } }).toArray();
    const teacherIds = teachers.map(t => t._id.toString());
    
    if (teacherIds.length > 0) {
      await syncTeacherClassesAndSubjects(teacherIds);
      console.log('[ML/Sync] Semua data kelas & mapel guru berhasil diselaraskan dengan jadwal.');
    }
  } catch (err) {
    console.error('[ML/Sync] Gagal sinkronisasi otomatis seluruh guru:', err);
  }
};

exports.createSchedule = async (data) => {
  if (!data.academic_year_id || !mongoose.Types.ObjectId.isValid(data.academic_year_id.toString())) {
    const activeYear = await mongoose.connection.collection('academic_years').findOne({ is_active: true });
    if (activeYear) {
      data.academic_year_id = activeYear._id;
    }
  }
  const created = await Schedule.create(data);
  if (created.teacher_id) {
    await syncTeacherClassesAndSubjects([created.teacher_id.toString()]);
  }
  return created;
};

exports.bulkSaveSchedule = async (scheduleList) => {
  if (!Array.isArray(scheduleList) || scheduleList.length === 0) return [];

  let defaultYearId = null;
  const activeYear = await mongoose.connection.collection('academic_years').findOne({ is_active: true });
  if (activeYear) {
    defaultYearId = activeYear._id;
  } else {
    const anyYear = await mongoose.connection.collection('academic_years').findOne({});
    if (anyYear) defaultYearId = anyYear._id;
  }

  const operations = [];

  for (const item of scheduleList) {
    if (!item.class_id || !item.subject_id || !item.teacher_id || !item.day || !item.time_slot) {
      continue;
    }

    const yearId = (item.academic_year_id && mongoose.Types.ObjectId.isValid(item.academic_year_id.toString()))
      ? new mongoose.Types.ObjectId(item.academic_year_id.toString())
      : defaultYearId;

    if (!yearId) continue;

    const classId = new mongoose.Types.ObjectId(item.class_id.toString());
    const subjectId = new mongoose.Types.ObjectId(item.subject_id.toString());
    const teacherId = new mongoose.Types.ObjectId(item.teacher_id.toString());

    operations.push({
      updateOne: {
        filter: {
          class_id: classId,
          academic_year_id: yearId,
          day: item.day,
          time_slot: Number(item.time_slot)
        },
        update: {
          $set: {
            subject_id: subjectId,
            teacher_id: teacherId,
            start_time: item.start_time || '07:00',
            end_time: item.end_time || '07:40',
            room: item.room || '',
            generated_type: item.generated_type || 'manual',
            updated_at: new Date()
          },
          $setOnInsert: {
            created_at: new Date()
          }
        },
        upsert: true
      }
    });
  }

  if (operations.length > 0) {
    await Schedule.bulkWrite(operations);
  }

  const teacherIds = [...new Set(scheduleList.map(s => s.teacher_id).filter(Boolean))];
  await syncTeacherClassesAndSubjects(teacherIds);

  return { success: true, count: operations.length };
};

exports.getAllSchedules = async () => {
  return await Schedule.find()
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .populate('academic_year_id', 'year semester')
    .sort({ day: 1, time_slot: 1 });
};

exports.getByAcademicYear = async (academicYearId) => {
  return await Schedule.find({ academic_year_id: academicYearId })
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .sort({ day: 1, time_slot: 1 });
};

exports.getTeacherSchedule = async (teacherId, academicYearId) => {
  const filter = { teacher_id: teacherId };
  if (academicYearId) filter.academic_year_id = academicYearId;
  return await Schedule.find(filter)
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .sort({ day: 1, time_slot: 1 });
};

exports.getClassSchedule = async (classId, academicYearId) => {
  const filter = { class_id: classId };
  if (academicYearId) filter.academic_year_id = academicYearId;
  return await Schedule.find(filter)
    .populate('teacher_id', 'full_name')
    .populate('subject_id', 'name code')
    .sort({ day: 1, time_slot: 1 });
};

exports.getTodaySchedule = async (teacherId, day) => {
  return await Schedule.find({ teacher_id: teacherId, day })
    .populate('class_id', 'name')
    .populate('subject_id', 'name code')
    .sort({ start_time: 1 });
};

exports.updateSchedule = async (id, data) => {
  const oldSchedule = await Schedule.findById(id);
  const updated = await Schedule.findByIdAndUpdate(id, data, { new: true });
  
  const teachersToSync = [];
  if (oldSchedule && oldSchedule.teacher_id) teachersToSync.push(oldSchedule.teacher_id.toString());
  if (updated && updated.teacher_id) teachersToSync.push(updated.teacher_id.toString());
  
  if (teachersToSync.length > 0) {
    await syncTeacherClassesAndSubjects([...new Set(teachersToSync)]);
  }
  return updated;
};

exports.deleteSchedule = async (id) => {
  const oldSchedule = await Schedule.findById(id);
  const deleted = await Schedule.findByIdAndDelete(id);
  if (oldSchedule && oldSchedule.teacher_id) {
    await syncTeacherClassesAndSubjects([oldSchedule.teacher_id.toString()]);
  }
  return deleted;
};

exports.updateTimeSlot = async ({ academic_year_id, time_slot, start_time, end_time }) => {
  const query = {
    academic_year_id: new mongoose.Types.ObjectId(academic_year_id),
    time_slot: Number(time_slot)
  };
  return await Schedule.updateMany(query, { $set: { start_time, end_time } });
};

exports.copySchedules = async ({ from_academic_year_id, to_academic_year_id }) => {
  const fromId = new mongoose.Types.ObjectId(from_academic_year_id);
  const toId = new mongoose.Types.ObjectId(to_academic_year_id);

  const sourceSchedules = await Schedule.find({ academic_year_id: fromId });
  if (sourceSchedules.length === 0) {
    throw new Error('Tidak ada jadwal ditemukan pada tahun ajaran asal.');
  }

  await Schedule.deleteMany({ academic_year_id: toId });

  const clonedSchedules = sourceSchedules.map(sch => {
    const obj = sch.toObject();
    delete obj._id;
    delete obj.created_at;
    delete obj.updated_at;
    obj.academic_year_id = toId;
    return obj;
  });

  const result = await Schedule.insertMany(clonedSchedules);

  const teacherIds = [...new Set(clonedSchedules.map(s => s.teacher_id.toString()))];
  if (teacherIds.length > 0) {
    await syncTeacherClassesAndSubjects(teacherIds);
  }

  return {
    copiedCount: result.length
  };
};

exports.deleteByAcademicYear = async (academicYearId) => {
  return await Schedule.deleteMany({ academic_year_id: academicYearId });
};

// ========== GENERATE DENGAN GEMINI AI ==========
exports.generateScheduleWithAI = async (academicYearId, classes, subjects, teachers, existingSchedules) => {
  // Validasi data master
  if (!classes || classes.length === 0) throw new Error('Data kelas kosong');
  if (!subjects || subjects.length === 0) throw new Error('Data mata pelajaran kosong');
  if (!teachers || teachers.length === 0) throw new Error('Data guru kosong');

  // Siapkan data ringkas untuk prompt
  const classList = classes.map(c => ({ id: c._id.toString(), name: c.name, grade: c.grade_level }));
  const subjectList = subjects.map(s => ({ id: s._id.toString(), name: s.name, code: s.code }));
  const teacherList = teachers.map(t => ({ id: t._id.toString(), name: t.full_name, subject_ids: t.subject_ids.map(id => id.toString()) }));

  const prompt = `Anda adalah sistem penjadwalan otomatis untuk sekolah. Buat jadwal pelajaran untuk tahun ajaran ID: ${academicYearId}.
Aturan:
- Hari: SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU.
- Time slot: 1 (07:00-08:00), 2 (08:00-09:00), 3 (09:00-10:00), 4 (10:00-11:00), 5 (11:00-12:00), 6 (12:00-13:00).
- Setiap guru tidak boleh mengajar di dua kelas atau slot yang sama pada hari yang sama.
- Setiap kelas harus mendapatkan semua mata pelajaran yang ada.
- Ruangan (room) bisa diisi "R01" sampai "R05" secara acak.

Data:
Kelas: ${JSON.stringify(classList)}
Mata Pelajaran: ${JSON.stringify(subjectList)}
Guru: ${JSON.stringify(teacherList)}

Berikut jadwal yang sudah ada (jangan buat duplikasi di slot yang sama untuk kelas yang sama): 
${JSON.stringify(existingSchedules.map(s => ({ day: s.day, time_slot: s.time_slot, class_id: s.class_id })))}

Output HARUS berupa ARRAY JSON dengan format:
[
  {
    "class_id": "id_kelas",
    "subject_id": "id_mapel",
    "teacher_id": "id_guru",
    "academic_year_id": "${academicYearId}",
    "day": "SENIN",
    "time_slot": 1,
    "start_time": "07:00",
    "end_time": "08:00",
    "room": "R01"
  },
  ...
]
Jangan tambahkan teks lain di luar array JSON.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('AI response raw:', responseText);
    
    // Bersihkan kemungkinan markdown
    let jsonString = responseText.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/```\n?/g, '');
    }
    
    const generated = JSON.parse(jsonString);
    if (!Array.isArray(generated) || generated.length === 0) {
      throw new Error('AI mengembalikan array kosong');
    }
    
    // Validasi setiap item memiliki field yang diperlukan
    for (const item of generated) {
      if (!item.class_id || !item.subject_id || !item.teacher_id || !item.day || !item.time_slot) {
        throw new Error('AI menghasilkan item dengan field tidak lengkap');
      }
    }
    return generated;
  } catch (err) {
    console.error('Gemini AI Error:', err);
    throw new Error(`Gagal generate jadwal: ${err.message}`);
  }
};