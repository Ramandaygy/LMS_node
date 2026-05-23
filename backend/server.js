require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Koneksi ke MongoDB Atlas
connectDB();

// Middleware global
app.use(cors());
app.use(express.json());

// Routes (pasang setelah middleware)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
//app.use('/api/monitoring', require('./routes/monitoringRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

//routes folder admin
app.use('/api/admin/users', require('./routes/admin/usersRoutes'));
app.use('/api/admin/subjects', require('./routes/admin/subjectsRoutes'));
app.use('/api/admin/export-import', require('./routes/admin/exportImportRoutes'));
app.use('/api/admin/schedule', require('./routes/admin/scheduleRoutes'));
app.use('/api/admin/reports', require('./routes/admin/reportsRoutes'));
app.use('/api/admin/settings', require('./routes/admin/settingsRoutes'));
app.use('/api/admin/academic', require('./routes/admin/academicRoutes'));



//routes folder guru
app.use('/api/guru/students', require('./routes/guru/studentsRoutes'));
app.use('/api/guru/assignments', require('./routes/guru/assignmentsRoutes'));
app.use('/api/guru/materials', require('./routes/guru/materialsRoutes'));
app.use('/api/guru/grades', require('./routes/guru/gradesRoutes'));
app.use('/api/guru/attendance', require('./routes/guru/attendanceRoutes'));


//routes folder siswa
app.use('/api/siswa/assignments', require('./routes/siswa/assignmentsRoutes'));


// Route test
app.get('/', (req, res) => {
    res.send('Backend jalan');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});