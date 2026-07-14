const fs = require('fs');
const path = require('path');

console.log('Generating 922 realistic student academic records for ATS dataset...');

const data = [];
const labels = [];

for (let i = 0; i < 922; i++) {
  // Menghasilkan data dengan distribusi yang mencakup rentang nilai hingga 100%
  const avgScore = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50 - 100
  const attendanceRate = Math.floor(Math.random() * (100 - 60 + 1)) + 60; // 60 - 100
  const materialCompletionRate = Math.floor(Math.random() * (100 - 40 + 1)) + 40; // 40 - 100
  const quizScore = Math.floor(Math.random() * (100 - 40 + 1)) + 40; // 40 - 100
  
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
