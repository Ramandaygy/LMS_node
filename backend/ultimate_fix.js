const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  
  const subjects = await db.collection('subjects').find({}).toArray();
  const getSubjId = (codeOrAlias) => {
    const s = subjects.find(x => x.code === codeOrAlias || x.name.toLowerCase().includes(codeOrAlias.toLowerCase()));
    return s ? s._id : null;
  };

  const updates = [
    { code: 'B', mapels: ['IPS'] },
    { code: 'C', mapels: ['Matematika'] },
    { code: 'D', mapels: ['Bahasa Indonesia'] },
    { code: 'E', mapels: ['Bahasa Inggris'] },
    { code: 'F', mapels: ['IPA'] },
    { code: 'G', mapels: ['Bahasa Inggris'] },
    { code: 'H', mapels: ['Bahasa Indonesia'] },
    { code: 'I', mapels: ['Matematika'] },
    { code: 'J', mapels: ['PJOK'] },
    { code: 'K', mapels: ['PAI'] },
    { code: 'L', mapels: ['Bahasa Indonesia'] },
    { code: 'M', mapels: ['PAI'] },
    { code: 'N', mapels: ['Prakarya'] },
    { code: 'O', mapels: ['IPS'] }, // Note: O is IPS in this script for simplicity, we'll handle her later
    { code: 'P', mapels: ['Bahasa Inggris'] },
    { code: 'Q', mapels: ['Jawa'] },
    { code: 'R', mapels: ['IPA'] },
    { code: 'S', mapels: ['Bahasa Indonesia'] },
    { code: 'T', mapels: ['IPS'] },
    { code: 'U', mapels: ['Bahasa Indonesia'] },
    { code: 'V', mapels: ['IPA'] },
    { code: 'W', mapels: ['Matematika'] },
    { code: 'X', mapels: ['PPKn'] },
    { code: 'Y', mapels: ['Matematika'] },
    { code: 'Z', mapels: ['Informatika'] },
    { code: 'Aa', mapels: ['IPA'] },
    { code: 'Bb', mapels: ['BK', 'IPS'] },
    { code: 'Cc', mapels: ['BK'] },
    { code: 'Dd', mapels: ['BK'] },
    { code: 'Ee', mapels: ['BK'] },
    { code: 'Ff', mapels: ['PPKn'] },
    { code: 'Gg', mapels: ['Prakarya', 'IPA'] }, // Make Prakarya first for Wahyu
    { code: 'Hh', mapels: ['Bahasa Inggris'] },
    { code: 'Ii', mapels: ['Matematika'] },
    { code: 'Jj', mapels: ['Bahasa Indonesia'] },
    { code: 'Kk', mapels: ['BK'] },
    { code: 'Ll', mapels: ['BK'] },
    { code: 'Mm', mapels: ['PAI'] },
    { code: 'Nn', mapels: ['Informatika', 'PPKn'] },
    { code: 'Oo', mapels: ['PJOK'] },
    { code: 'Pp', mapels: ['Rupa'] },
    { code: 'Qq', mapels: ['Tari'] },
    { code: 'Rr', mapels: ['Bahasa Inggris', 'PPKn'] },
    { code: 'Ss', mapels: ['PJOK'] },
    { code: 'Tt', mapels: ['Informatika'] },
    { code: 'Uu', mapels: ['PAI', 'PPKn'] },
    { code: 'Vv', mapels: ['IPS', 'PPKn'] },
    { code: 'Ww', mapels: ['Informatika'] },
    { code: 'Xx', mapels: ['Jawa', 'PPKn'] },
    { code: 'Yy', mapels: ['Bahasa Indonesia'] }
  ];

  // 1. FIX ALL TEACHER SUBJECTS
  let updatedCount = 0;
  for (const u of updates) {
    const sIds = u.mapels.map(m => getSubjId(m)).filter(Boolean);
    if (sIds.length > 0) {
      await db.collection('users_guru').updateOne(
        { teacher_code: u.code },
        { $set: { subjects: sIds, subject_ids: sIds } }
      );
      updatedCount++;
    }
  }
  console.log('Successfully updated subjects for ' + updatedCount + ' teachers!');

  // 2. REFRESH TEACHERS
  const teachers = await db.collection('users_guru').find({}).toArray();

  // 3. FIX SCHEDULES BASED ON TEACHER
  const schedules = await db.collection('schedules').find({ generated_type: 'import' }).toArray();
  let schedUpdates = 0;
  
  for (const s of schedules) {
    if (!s.teacher_id) continue;
    const t = teachers.find(t => t._id.toString() === s.teacher_id.toString());
    if (t && t.subjects && t.subjects.length > 0) {
      const properSubId = t.subjects[0];
      if (s.subject_id?.toString() !== properSubId.toString()) {
        await db.collection('schedules').updateOne({ _id: s._id }, { $set: { subject_id: properSubId } });
        schedUpdates++;
      }
    }
  }
  
  console.log('Fixed ' + schedUpdates + ' schedules based on teacher subject.');

  process.exit(0);
}).catch(console.error);
