const Schedule = require('../../models/Schedule');
const Class = require('../../models/Class');
const Subject = require('../../models/Subject');
const UserGuru = require('../../models/UserGuru');
const { ObjectId } = require('mongoose').Types;

// TIME_SLOT_MAP konstan
const TIME_SLOT_MAP = {
  1: { start: '07:30', end: '08:30' },
  2: { start: '08:30', end: '09:30' },
  3: { start: '09:45', end: '10:45' },
  4: { start: '10:45', end: '11:45' },
  5: { start: '12:30', end: '13:30' },
  6: { start: '13:30', end: '14:30' }
};

// GET /schedule
exports.getSchedule = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    let query = {};
    if (academic_year_id && ObjectId.isValid(academic_year_id)) {
      query.academic_year_id = new ObjectId(academic_year_id);
    }

    const schedules = await Schedule.find(query).lean();

    // Ambil semua data relasi (teacher, class, subject) dalam satu query untuk efisiensi
    const teacherIds = schedules.map(s => s.teacher_id).filter(id => id);
    const classIds = schedules.map(s => s.class_id).filter(id => id);
    const subjectIds = schedules.map(s => s.subject_id).filter(id => id);

    const teachers = await UserGuru.find({ _id: { $in: teacherIds } }).lean();
    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();

    const teacherMap = new Map(teachers.map(t => [t._id.toString(), t]));
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));

    const result = schedules.map(s => {
      const teacher = teacherMap.get(s.teacher_id?.toString());
      const classDoc = classMap.get(s.class_id?.toString());
      const subject = subjectMap.get(s.subject_id?.toString());
      return {
        ...s,
        _id: s._id.toString(),
        teacher_id: s.teacher_id?.toString(),
        class_id: s.class_id?.toString(),
        subject_id: s.subject_id?.toString(),
        academic_year_id: s.academic_year_id?.toString(),
        teacher_name: teacher?.full_name || '',
        teacher_code: teacher?.nip || '',
        class_name: classDoc?.name || '',
        subject_name: subject?.name || '',
        subject_code: subject?.code || ''
      };
    });

    res.json({ schedule: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /schedule/bulk
exports.bulkSaveSchedule = async (req, res) => {
  try {
    const { schedule: schedulesData } = req.body;
    if (!schedulesData || !Array.isArray(schedulesData) || schedulesData.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data schedule' });
    }

    const first = schedulesData[0];
    const academic_year_id = first.academic_year_id;
    if (!academic_year_id || !ObjectId.isValid(academic_year_id)) {
      return res.status(400).json({ error: 'academic_year_id tidak valid' });
    }

    // Hapus semua jadwal untuk tahun ajaran ini
    await Schedule.deleteMany({ academic_year_id: new ObjectId(academic_year_id) });

    const newSchedules = [];
    for (const item of schedulesData) {
      const required = ['day', 'time_slot', 'class_id', 'subject_id', 'teacher_id'];
      if (!required.every(field => item[field])) continue;

      let timeSlot = parseInt(item.time_slot);
      const timeRange = TIME_SLOT_MAP[timeSlot];
      if (!timeRange) continue;

      newSchedules.push({
        day: item.day,
        start_time: timeRange.start,
        end_time: timeRange.end,
        class_id: new ObjectId(item.class_id),
        subject_id: new ObjectId(item.subject_id),
        teacher_id: new ObjectId(item.teacher_id),
        academic_year_id: new ObjectId(academic_year_id),
        room: item.room || '',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    if (newSchedules.length) {
      await Schedule.insertMany(newSchedules);
    }
    res.json({ message: `${newSchedules.length} jadwal disimpan` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /schedule/auto-generate
exports.autoGenerateSchedule = async (req, res) => {
  try {
    const { academic_year_id } = req.body;
    if (!academic_year_id || !ObjectId.isValid(academic_year_id)) {
      return res.status(400).json({ error: 'academic_year_id tidak valid' });
    }

    const classes = await Class.find({ is_active: true }).lean();
    const subjects = await Subject.find({ is_active: true }).lean();
    const teachers = await UserGuru.find({ is_active: true }).lean();

    if (!classes.length || !subjects.length || !teachers.length) {
      return res.status(400).json({ error: 'Data kelas/mapel/guru tidak lengkap' });
    }

    // Map teacher subjects: teacherId -> array of subject names (lowercase)
    const teacherSubjects = new Map();
    for (const t of teachers) {
      const subjectNames = [];
      for (const subjId of t.subjects || []) {
        const subject = await Subject.findById(subjId).lean();
        if (subject) subjectNames.push(subject.name.toLowerCase().trim());
      }
      teacherSubjects.set(t._id.toString(), subjectNames);
    }

    const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const timeSlots = [1, 2, 3, 4, 5, 6];
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let scheduleItems = [];
      let conflict = false;

      for (const cls of classes) {
        const classIdStr = cls._id.toString();
        for (const day of days) {
          for (const slot of timeSlots) {
            if (!subjects.length) { conflict = true; break; }
            // Pilih subject acak
            const randomIndex = Math.floor(Math.random() * subjects.length);
            const subject = subjects[randomIndex];
            const subjIdStr = subject._id.toString();
            const subjName = subject.name.toLowerCase().trim();

            // Cari guru yang mengampu mapel ini
            const eligibleTeacherIds = [];
            for (const [tid, subjs] of teacherSubjects.entries()) {
              if (subjs.includes(subjName)) eligibleTeacherIds.push(tid);
            }
            if (eligibleTeacherIds.length === 0) {
              conflict = true;
              break;
            }
            const teacherId = eligibleTeacherIds[Math.floor(Math.random() * eligibleTeacherIds.length)];

            // Cek konflik: guru tidak boleh mengajar di hari dan slot yang sama
            const already = scheduleItems.some(item => 
              item.day === day && item.time_slot === slot && item.teacher_id === teacherId
            );
            if (already) {
              conflict = true;
              break;
            }

            scheduleItems.push({
              day,
              time_slot: slot,
              class_id: classIdStr,
              subject_id: subjIdStr,
              teacher_id: teacherId,
              academic_year_id
            });
          }
          if (conflict) break;
        }
        if (conflict) break;
      }

      if (!conflict) {
        // Hapus jadwal lama
        await Schedule.deleteMany({ academic_year_id: new ObjectId(academic_year_id) });

        const newSchedules = [];
        for (const item of scheduleItems) {
          const timeRange = TIME_SLOT_MAP[item.time_slot];
          if (!timeRange) continue;
          newSchedules.push({
            day: item.day,
            start_time: timeRange.start,
            end_time: timeRange.end,
            class_id: new ObjectId(item.class_id),
            subject_id: new ObjectId(item.subject_id),
            teacher_id: new ObjectId(item.teacher_id),
            academic_year_id: new ObjectId(academic_year_id),
            room: '',
            created_at: new Date(),
            updated_at: new Date()
          });
        }
        if (newSchedules.length) {
          await Schedule.insertMany(newSchedules);
        }
        return res.json({ message: `Jadwal berhasil digenerate (${newSchedules.length} slot)` });
      }
    }

    return res.status(500).json({ error: 'Gagal generate jadwal. Pastikan setiap mapel memiliki minimal satu guru.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};