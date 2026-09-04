const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  
  // Ambil data
  const classes = await db.collection('classes').find({ name: /^8|VIII/ }).toArray();
  const classIds = classes.map(c => c._id);
  const teachers = await db.collection('users_guru').find({}).toArray();
  const subjects = await db.collection('subjects').find({}).toArray();

  // Cari ID guru O dan Gg
  const istiqomah = teachers.find(t => t.teacher_code === 'O');
  const wahyu = teachers.find(t => t.teacher_code === 'Gg');
  
  // Cari ID mapel IPS dan Prakarya
  const ips = subjects.find(s => s.name.toLowerCase().includes('sosial'));
  const prakarya = subjects.find(s => s.name.toLowerCase().includes('prakarya'));

  let updatedCount = 0;

  if (istiqomah && ips) {
    // Ubah semua jadwal Istiqomah di kelas 8 menjadi IPS
    const res = await db.collection('schedules').updateMany(
      { class_id: { $in: classIds }, teacher_id: istiqomah._id },
      { $set: { subject_id: ips._id } }
    );
    updatedCount += res.modifiedCount;
    console.log(`Updated ${res.modifiedCount} slots for Istiqomah to IPS`);
  }

  if (wahyu && prakarya) {
    // Ubah semua jadwal Wahyu Indrianto di kelas 8 menjadi Prakarya
    const res = await db.collection('schedules').updateMany(
      { class_id: { $in: classIds }, teacher_id: wahyu._id },
      { $set: { subject_id: prakarya._id } }
    );
    updatedCount += res.modifiedCount;
    console.log(`Updated ${res.modifiedCount} slots for Wahyu Indrianto to Prakarya`);
  }

  console.log(`Total schedules auto-adjusted: ${updatedCount}`);
  process.exit(0);
}).catch(console.error);
