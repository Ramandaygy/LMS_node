const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('users_guru').updateOne(
    { full_name: 'Takhuri, S.Pd', teacher_code: 'Q' },
    { $set: { teacher_code: 'X' } }
  );
  console.log('Fixed Takhuri code to X');
  process.exit(0);
}).catch(console.error);
