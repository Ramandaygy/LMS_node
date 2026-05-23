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

// Route test
app.get('/', (req, res) => {
    res.send('Backend jalan');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});