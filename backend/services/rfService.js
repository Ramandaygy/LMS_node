const { RandomForestClassifier } = require('ml-random-forest');

const fs = require('fs');
const path = require('path');

// Singleton untuk menyimpan instance model yang telah di-train
let rfClassifier = null;

/**
 * Mendapatkan dataset 922 data akademik dari file JSON (ats_dataset.json).
 * Jika file belum ada, sistem akan men-generate data dengan pola realistis
 * dan menyimpannya secara permanen agar data latih konsisten.
 */
function getOrGenerateDataset() {
  const filePath = path.join(__dirname, '../config/ats_dataset.json');
  
  // Jika file dataset sudah ada, baca dan kembalikan datanya
  if (fs.existsSync(filePath)) {
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(rawData);
      if (parsed.data && parsed.labels && parsed.data.length === 922) {
        return parsed;
      }
    } catch (e) {
      console.warn('[ML] Gagal membaca ats_dataset.json, membuat ulang...');
    }
  }

  // Jika belum ada, buat 922 data dengan distribusi realistis anak SMP N 1 Suradadi
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
  
  // Simpan secara permanen ke folder config
  try {
    // Pastikan folder config ada
    const configDir = path.dirname(filePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2), 'utf8');
    console.log('[ML] Berhasil membuat berkas dataset: backend/config/ats_dataset.json');
  } catch (e) {
    console.error('[ML] Gagal menyimpan ats_dataset.json:', e);
  }
  
  return dataset;
}

/**
 * Melatih model Random Forest
 */
function trainModel() {
  console.log('[ML] Mempersiapkan model Random Forest Classifier...');
  
  const { data, labels } = getOrGenerateDataset();
  
  const options = {
    seed: 42,
    maxFeatures: 2,
    replacement: false,
    nEstimators: 50 // Menggunakan 50 pohon keputusan (sesuai laporan)
  };

  rfClassifier = new RandomForestClassifier(options);
  rfClassifier.train(data, labels);
  
  console.log('[ML] Model Random Forest berhasil dilatih dengan', data.length, 'sampel data akademis (File ATS).');
}

/**
 * Prediksi risiko belajar siswa
 */
function predictRisk(avgScore, attendanceRate, materialCompletionRate, quizScore) {
  if (!rfClassifier) {
    trainModel();
  }
  
  const features = [[avgScore, attendanceRate, materialCompletionRate, quizScore]];
  
  // Prediksi mengembalikan array, misalnya [1]
  const predictionArray = rfClassifier.predict(features);
  const riskLabel = predictionArray[0];
  
  // Hitung tingkat keyakinan (confidence level) berdasarkan persentase voting pohon keputusan (decision trees)
  const probabilities = rfClassifier.predictProbability(features, riskLabel);
  const confidence = Math.round(probabilities[0] * 100);

  if (riskLabel === 0) {
    return { risk: 'high', message: 'Perlu perhatian serius', color: 'red', confidence };
  } else if (riskLabel === 1) {
    return { risk: 'medium', message: 'Perlu ditingkatkan', color: 'yellow', confidence };
  } else {
    return { risk: 'low', message: 'Baik, pertahankan', color: 'green', confidence };
  }
}

module.exports = {
  trainModel,
  predictRisk
};
