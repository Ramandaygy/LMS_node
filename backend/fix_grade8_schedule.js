const mongoose = require('mongoose');

const MAPPING_RULES = {
  // 1. PAIBP
  PAIBP: {
    A: 'K', B: 'K', C: 'K', D: 'K', E: 'K', F: 'K', G: 'K',
    H: 'M', I: 'M', J: 'M'
  },
  // 2. PPKn
  PPKn: {
    A: 'X', B: 'X', C: 'X', D: 'X', E: 'X', F: 'X', G: 'X', H: 'X', I: 'X', J: 'X'
  },
  // 3. Bahasa Indonesia
  BIN: {
    A: 'D', B: 'D',
    C: 'Yy', D: 'Yy', J: 'Yy',
    E: 'L', F: 'L', G: 'L', H: 'L', I: 'L'
  },
  // 4. Bahasa Inggris
  BIG: {
    C: 'P', D: 'P', E: 'P', F: 'P', G: 'P',
    H: 'Hh',
    I: 'Rr', J: 'Rr'
    // A, B -> unassigned
  },
  // 5. Matematika
  MAT: {
    A: 'I', B: 'I', C: 'I', D: 'I', E: 'I',
    G: 'Ii', H: 'Ii', I: 'Ii', J: 'Ii'
    // F -> unassigned
  },
  // 6. IPA
  IPA: {
    A: 'R', B: 'R', C: 'R', D: 'R', E: 'R', F: 'R',
    G: 'Aa', H: 'Aa', I: 'Aa', J: 'Aa'
  },
  // 7. IPS
  IPS: {
    A: 'O', B: 'O', C: 'O', D: 'O',
    E: 'Vv', F: 'Vv',
    G: 'T', H: 'T', I: 'T', J: 'T'
  },
  // 8. Seni / Prakarya
  // Ada 2 mapel di DB: SENI dan PRAKARYA. Kita asumsikan dua-duanya pakai mapping ini
  SENI: {
    A: 'N', B: 'N', C: 'N', D: 'N', E: 'N',
    F: 'Gg',
    G: 'Qq', H: 'Qq', I: 'Qq', J: 'Qq'
  },
  PRAKARYA: {
    A: 'N', B: 'N', C: 'N', D: 'N', E: 'N',
    F: 'Gg',
    G: 'Qq', H: 'Qq', I: 'Qq', J: 'Qq'
  },
  // 9. PJOK
  PJOK: {
    A: 'Oo', B: 'Oo', C: 'Oo', D: 'Oo', E: 'Oo',
    F: 'Ss', G: 'Ss', H: 'Ss', I: 'Ss', J: 'Ss'
  },
  // 10. Bahasa Jawa
  BJW: {
    A: 'Q', B: 'Q', C: 'Q', D: 'Q', E: 'Q', F: 'Q', G: 'Q', H: 'Q', I: 'Q', J: 'Q'
  },
  // 11. Informatika
  TIK: {
    G: 'Z', H: 'Z', I: 'Z',
    J: 'Nn'
    // A-F -> unassigned
  },
  // 12. BK
  BK: {
    A: 'Bb', B: 'Bb', C: 'Bb', D: 'Bb', E: 'Bb',
    F: 'Ee', G: 'Ee', H: 'Ee', I: 'Ee', J: 'Ee'
  }
};

mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority')
  .then(async () => {
    const db = mongoose.connection.db;

    console.log('--- FETCHING DATA ---');
    const classes = await db.collection('classes').find({}).toArray();
    const subjects = await db.collection('subjects').find({}).toArray();
    const teachers = await db.collection('users_guru').find({}).toArray();
    const activeYear = await db.collection('academic_years').findOne({ is_active: true });

    if (!activeYear) {
      console.log('No active year found!');
      process.exit(1);
    }

    // Helper functions
    const getGrade8ClassId = (suffix) => classes.find(c => c.name.toUpperCase() === `8${suffix}` || c.name.toUpperCase() === `VIII ${suffix}`);
    const getSubjectByAlias = (subj) => {
      // Map mapping code to actual subject ID
      let keywords = [];
      if (subj === 'PAIBP') keywords = ['pendidikan agama islam'];
      if (subj === 'PPKn') keywords = ['pancasila'];
      if (subj === 'BIN') keywords = ['bahasa indonesia'];
      if (subj === 'BIG') keywords = ['bahasa inggris'];
      if (subj === 'MAT') keywords = ['matematika'];
      if (subj === 'IPA') keywords = ['pengetahuan alam'];
      if (subj === 'IPS') keywords = ['pengetahuan sosial'];
      if (subj === 'SENI') keywords = ['seni'];
      if (subj === 'PRAKARYA') keywords = ['prakarya'];
      if (subj === 'PJOK') keywords = ['jasmani'];
      if (subj === 'BJW') keywords = ['jawa'];
      if (subj === 'TIK') keywords = ['informatika'];
      if (subj === 'BK') keywords = ['bimbingan'];

      return subjects.find(s => keywords.some(k => s.name.toLowerCase().includes(k)));
    };

    const subjMap = {}; // mapping key (PAIBP) to subject_id
    const subjIdToKey = {}; // subject_id to mapping key
    for (const key of Object.keys(MAPPING_RULES)) {
      const s = getSubjectByAlias(key);
      if (s) {
        subjMap[key] = s._id.toString();
        subjIdToKey[s._id.toString()] = key;
      }
    }

    console.log('\n--- TAHAP 1: FIXING TEACHER CLASSES MASTER DATA ---');
    let teacherUpdates = 0;
    
    // First, build a map of what classes each teacher SHOULD have for Grade 8
    const teacherGrade8Classes = {}; // teacher_code -> Set of class_ids
    
    ['A','B','C','D','E','F','G','H','I','J'].forEach(suffix => {
      const cls = getGrade8ClassId(suffix);
      if (!cls) return;
      
      Object.values(MAPPING_RULES).forEach(classMap => {
        const teacherCode = classMap[suffix];
        if (teacherCode) {
          if (!teacherGrade8Classes[teacherCode]) teacherGrade8Classes[teacherCode] = new Set();
          teacherGrade8Classes[teacherCode].add(cls._id.toString());
        }
      });
    });

    for (const t of teachers) {
      const currentClasses = t.classes || [];
      const currentClassIds = currentClasses.map(c => c.toString());
      
      // Separate Grade 7 and Grade 9 classes
      const nonGrade8ClassIds = currentClassIds.filter(cid => {
        const clsObj = classes.find(c => c._id.toString() === cid);
        if (!clsObj) return false;
        return !clsObj.name.startsWith('8') && !clsObj.name.toUpperCase().startsWith('VIII');
      });

      // Get accurate Grade 8 classes for this teacher
      const correctGrade8ClassIds = teacherGrade8Classes[t.teacher_code] ? Array.from(teacherGrade8Classes[t.teacher_code]) : [];
      
      // Merge
      const finalClassIds = [...new Set([...nonGrade8ClassIds, ...correctGrade8ClassIds])].map(id => new mongoose.Types.ObjectId(id));
      
      // Update if changed
      const originalGrade8 = currentClassIds.filter(id => !nonGrade8ClassIds.includes(id)).sort().join(',');
      const newGrade8 = correctGrade8ClassIds.sort().join(',');

      if (originalGrade8 !== newGrade8) {
        await db.collection('users_guru').updateOne({ _id: t._id }, { $set: { classes: finalClassIds } });
        teacherUpdates++;
        const clsNamesOld = originalGrade8.split(',').filter(Boolean).map(id => classes.find(c=>c._id.toString()===id)?.name).join(', ');
        const clsNamesNew = newGrade8.split(',').filter(Boolean).map(id => classes.find(c=>c._id.toString()===id)?.name).join(', ');
        console.log(`Updated ${t.teacher_code} (${t.full_name}): Grade 8 classes [${clsNamesOld}] -> [${clsNamesNew}]`);
      }
    }
    console.log(`=> Fixed classes for ${teacherUpdates} teachers.`);

    console.log('\n--- TAHAP 2: FIXING SCHEDULES ---');
    const schedules = await db.collection('schedules').find({ academic_year_id: activeYear._id }).toArray();
    let scheduleUpdates = 0;
    let alreadyCorrect = 0;
    let unassignedMade = 0;
    let unassignedAlready = 0;
    let reportLog = "Kelas,Mata Pelajaran,Waktu,Sebelum(Kode/Nama),Sesudah(Kode/Nama),Status\n";

    for (const sched of schedules) {
      if (!sched.class_id || !sched.subject_id) continue;
      
      const cls = classes.find(c => c._id.toString() === sched.class_id.toString());
      if (!cls) continue;
      
      // Only process Grade 8
      if (!cls.name.startsWith('8') && !cls.name.toUpperCase().startsWith('VIII')) continue;
      
      const suffixMatch = cls.name.match(/[A-J]$/i);
      if (!suffixMatch) continue;
      const suffix = suffixMatch[0].toUpperCase();

      const mapKey = subjIdToKey[sched.subject_id.toString()];
      if (!mapKey) continue; // Not a mapped subject

      const expectedTeacherCode = MAPPING_RULES[mapKey][suffix];
      let expectedTeacherObj = null;
      if (expectedTeacherCode) {
        expectedTeacherObj = teachers.find(t => t.teacher_code === expectedTeacherCode);
      }

      const currentTeacherId = sched.teacher_id ? sched.teacher_id.toString() : null;
      const currentTeacherObj = currentTeacherId ? teachers.find(t => t._id.toString() === currentTeacherId) : null;
      const currentTeacherCode = currentTeacherObj ? currentTeacherObj.teacher_code : '-';
      const currentTeacherName = currentTeacherObj ? currentTeacherObj.full_name : 'UNASSIGNED';

      const subjectObj = subjects.find(s => s._id.toString() === sched.subject_id.toString());
      const subjectName = subjectObj ? subjectObj.name : 'Unknown Subject';
      const timeStr = `${sched.day} ${sched.start_time}-${sched.end_time}`;

      if (expectedTeacherObj) {
        if (currentTeacherId !== expectedTeacherObj._id.toString()) {
          // Fix it
          await db.collection('schedules').updateOne({ _id: sched._id }, { $set: { teacher_id: expectedTeacherObj._id } });
          scheduleUpdates++;
          reportLog += `8${suffix},${subjectName},${timeStr},${currentTeacherCode} / ${currentTeacherName},${expectedTeacherCode} / ${expectedTeacherObj.full_name},CORRECTED\n`;
        } else {
          alreadyCorrect++;
          reportLog += `8${suffix},${subjectName},${timeStr},${currentTeacherCode} / ${currentTeacherName},${expectedTeacherCode} / ${expectedTeacherObj.full_name},ALREADY CORRECT\n`;
        }
      } else {
        // Unassigned
        if (currentTeacherId !== null) {
          await db.collection('schedules').updateOne({ _id: sched._id }, { $set: { teacher_id: null } });
          unassignedMade++;
          reportLog += `8${suffix},${subjectName},${timeStr},${currentTeacherCode} / ${currentTeacherName},UNASSIGNED / -,CORRECTED TO UNASSIGNED\n`;
        } else {
          unassignedAlready++;
          reportLog += `8${suffix},${subjectName},${timeStr},UNASSIGNED / -,UNASSIGNED / -,ALREADY UNASSIGNED\n`;
        }
      }
    }

    console.log(`=> Schedules fixed: ${scheduleUpdates}`);
    console.log(`=> Made Unassigned: ${unassignedMade}`);
    console.log(`=> Already Correct: ${alreadyCorrect}`);
    console.log(`=> Already Unassigned: ${unassignedAlready}`);

    const fs = require('fs');
    fs.writeFileSync('C:/Users/Lenovo/.gemini/antigravity-ide/brain/6e7e30ca-45f2-46e6-bccb-c4f01e553624/schedule_report.csv', reportLog);
    console.log('Report saved to schedule_report.csv');

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
