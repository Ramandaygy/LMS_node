const fs = require('fs');
const path = require('path');

console.log('Generating 922 balanced student academic records for ATS dataset...');

const data = [];
const labels = [];

for (let i = 0; i < 922; i++) {
  let avgScore, attendanceRate, materialCompletionRate, quizScore, label;
  
  // Distribusi kelas yang seimbang (33% untuk masing-masing kelas)
  const r = i % 3;
  if (r === 2) {
    // Low Risk (Aman)
    avgScore = Math.floor(Math.random() * (100 - 75 + 1)) + 75; // 75 - 100
    attendanceRate = Math.floor(Math.random() * (100 - 85 + 1)) + 85; // 85 - 100
    materialCompletionRate = Math.floor(Math.random() * (100 - 75 + 1)) + 75; // 75 - 100
    quizScore = Math.floor(Math.random() * (100 - 70 + 1)) + 70; // 70 - 100
    label = 2;
  } else if (r === 1) {
    // Medium Risk
    avgScore = Math.floor(Math.random() * (100 - 60 + 1)) + 60; // 60 - 100
    attendanceRate = Math.floor(Math.random() * (100 - 70 + 1)) + 70; // 70 - 100
    materialCompletionRate = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50 - 100
    quizScore = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50 - 100
    
    // Paksa setidaknya satu fitur masuk ke rentang Medium Risk agar label valid
    const forceMedium = Math.floor(Math.random() * 4);
    if (forceMedium === 0) avgScore = Math.floor(Math.random() * (74 - 60 + 1)) + 60;
    else if (forceMedium === 1) attendanceRate = Math.floor(Math.random() * (84 - 70 + 1)) + 70;
    else if (forceMedium === 2) materialCompletionRate = Math.floor(Math.random() * (74 - 50 + 1)) + 50;
    else if (forceMedium === 3) quizScore = Math.floor(Math.random() * (69 - 50 + 1)) + 50;
    
    label = 1;
  } else {
    // High Risk
    avgScore = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
    attendanceRate = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
    materialCompletionRate = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
    quizScore = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
    
    // Paksa setidaknya satu fitur masuk ke rentang High Risk agar label valid
    const forceHigh = Math.floor(Math.random() * 4);
    if (forceHigh === 0) avgScore = Math.floor(Math.random() * 59);
    else if (forceHigh === 1) attendanceRate = Math.floor(Math.random() * 69);
    else if (forceHigh === 2) materialCompletionRate = Math.floor(Math.random() * 49);
    else if (forceHigh === 3) quizScore = Math.floor(Math.random() * 49);
    
    label = 0;
  }
  
  // Noise kecil 1% agar model ML belajar generalisasi secara stabil
  if (Math.random() < 0.01) {
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
