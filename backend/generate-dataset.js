const fs = require('fs');
const path = require('path');

console.log('Generating 922 realistic student academic records for ATS dataset...');

const data = [];
const labels = [];

for (let i = 0; i < 922; i++) {
  // Rata-rata nilai tugas: dominan di rentang 65-90
  const avgScore = Math.min(100, Math.max(0, Math.round(75 + (Math.random() - 0.5) * 25)));
  
  // Kehadiran: mayoritas siswa rajin (>85%), beberapa ada yang bermasalah
  const attendanceRate = Math.min(100, Math.max(0, Math.round(92 - (Math.random() * Math.random()) * 35)));
  
  // Penyelesaian materi: dominan di rentang 60-95%
  const materialCompletionRate = Math.min(100, Math.max(0, Math.round(80 - (Math.random() * Math.random()) * 45)));
  
  // Rata-rata nilai kuis: dominan di rentang 60-88
  const quizScore = Math.min(100, Math.max(0, Math.round(72 + (Math.random() - 0.5) * 30)));
  
  let label = 2; // Low Risk (Aman)
  
  // Rule klasifikasi awal untuk pembelajaran model (sesuai EWS)
  if (avgScore < 60 || attendanceRate < 70 || materialCompletionRate < 50 || quizScore < 50) {
    label = 0; // High Risk
  } else if (avgScore < 75 || attendanceRate < 85 || materialCompletionRate < 75 || quizScore < 70) {
    label = 1; // Medium Risk
  }
  
  // Noise 5% agar model ML belajar generalisasi pola secara statistik
  if (Math.random() < 0.05) {
    label = [0, 1, 2][Math.floor(Math.random() * 3)];
  }
  
  data.push([avgScore, attendanceRate, materialCompletionRate, quizScore]);
  labels.push(label);
}

const dataset = { data, labels };
const filePath = path.join(__dirname, 'config/ats_dataset.json');

try {
  const configDir = path.dirname(filePath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`\x1b[32m[SUKSES] Berhasil membuat ${data.length} data dan menyimpannya ke: backend/config/ats_dataset.json\x1b[0m`);
} catch (e) {
  console.error('[GAGAL] Gagal menyimpan file:', e);
}
