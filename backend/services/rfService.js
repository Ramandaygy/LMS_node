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
    // Menghasilkan data dengan distribusi yang realistis (tidak seragam 0-100)
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
