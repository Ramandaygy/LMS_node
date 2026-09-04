const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const teachers = await db.collection('users_guru').find({}).toArray();
  const schedules = await db.collection('schedules').find({}).toArray();
  const classes = await db.collection('classes').find({}).toArray();
  const subjects = await db.collection('subjects').find({}).toArray();

  let schedUpdates = 0;
  
  for (const s of schedules) {
    if (!s.teacher_id) continue;
    const t = teachers.find(t => t._id.toString() === s.teacher_id.toString());
    const c = classes.find(c => c._id.toString() === s.class_id.toString());
    
    if (t && c && t.subjects && t.subjects.length > 0) {
      let properSubId = t.subjects[0];
      
      // Khusus untuk guru rangkap di kelas 8 (Istiqomah dan Wahyu)
      if (c.name.match(/^8|VIII/)) {
        if (t.teacher_code === 'O') {
           // Istiqomah di kelas 8 mengajar IPS
           const ips = subjects.find(sub => sub.name.toLowerCase().includes('sosial'));
           if (ips) properSubId = ips._id;
        } else if (t.teacher_code === 'Gg') {
           // Wahyu Indrianto di kelas 8 mengajar Prakarya
           const prakarya = subjects.find(sub => sub.name.toLowerCase().includes('prakarya'));
           if (prakarya) properSubId = prakarya._id;
        }
      }
      
      if (s.subject_id?.toString() !== properSubId.toString()) {
        await db.collection('schedules').updateOne({ _id: s._id }, { $set: { subject_id: properSubId } });
        schedUpdates++;
      }
    }
  }
  
  console.log('Fixed ' + schedUpdates + ' schedules based on teacher subject.');
  process.exit(0);
}).catch(console.error);
