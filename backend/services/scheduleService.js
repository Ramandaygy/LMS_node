const Schedule = require('../models/Schedule');
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.createSchedule = async (data) => {
  return await Schedule.create(data);
};

exports.bulkSaveSchedule = async (scheduleList) => {
  const results = [];
  for (const item of scheduleList) {
    // Cari jadwal existing berdasarkan kombinasi unik
    const existing = await Schedule.findOne({
      class_id: item.class_id,
      academic_year_id: item.academic_year_id,
      day: item.day,
      time_slot: item.time_slot
    });

    if (existing) {
      existing.subject_id = item.subject_id;
      existing.teacher_id = item.teacher_id;
      existing.start_time = item.start_time;
      existing.end_time = item.end_time;
      existing.room = item.room || '';
      // generated_type dan generated_by bisa diupdate jika diperlukan
      await existing.save();
      results.push(existing);
    } else {
      const created = await Schedule.create(item);
      results.push(created);
    }
  }
  return results;
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
  return await Schedule.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteSchedule = async (id) => {
  return await Schedule.findByIdAndDelete(id);
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