/**
 * Rule-Based Academic Risk Classifier Engine
 * LMS SMP Negeri 1 Suradadi
 * 
 * Klasifikasi Risiko Perkembangan Belajar Siswa Berbasis Aturan Ambang Batas Resmi (KKM 75):
 * - High Risk   : Rata-rata Nilai < 60 OR Presensi < 70% OR Penyelesaian Materi < 50%
 * - Medium Risk : Rata-rata Nilai < 75 (Di bawah KKM) OR Presensi < 85% OR Penyelesaian Materi < 75%
 * - Low Risk    : Tuntas KKM (≥75) & Presensi Disiplin (≥85%) & Materi (≥75%)
 */

function predictRisk(avgScore, attendanceRate, materialCompletionRate, quizScore, kkmScore = 75) {
  const avg = Number(avgScore) || 0;
  const att = Number(attendanceRate) || 0;
  const mat = Number(materialCompletionRate) || 0;
  const quiz = Number(quizScore) || 0;
  const kkm = Number(kkmScore) || 75;

  // Rule 1: High Risk (Risiko Tinggi / Perlu Intervensi BK & Guru)
  if (avg < (kkm - 15) || att < 70 || mat < 50 || quiz < 50) {
    return {
      risk: 'high',
      message: 'Perlu perhatian serius (Risiko Tinggi)',
      color: 'red',
      rule_triggered: `Nilai sangat rendah (< ${kkm - 15}), Presensi < 70%, atau Penyelesaian Materi < 50%`,
      confidence: 100
    };
  }

  // Rule 2: Medium Risk (Risiko Sedang / Di bawah KKM atau Presensi < 85%)
  if (avg < kkm || att < 85 || mat < 75 || quiz < 70) {
    return {
      risk: 'medium',
      message: `Perlu ditingkatkan (Di bawah KKM ${kkm} / Waspada)`,
      color: 'yellow',
      rule_triggered: `Nilai di bawah KKM (${kkm}) atau Presensi di bawah 85%`,
      confidence: 100
    };
  }

  // Rule 3: Low Risk (Risiko Rendah / Tuntas & Disiplin)
  return {
    risk: 'low',
    message: `Sangat baik, pertahankan (Tuntas KKM ${kkm} & Disiplin)`,
    color: 'green',
    rule_triggered: `Memenuhi KKM (≥${kkm}) & Presensi Disiplin (≥85%)`,
    confidence: 100
  };
}

function trainModel() {
  console.log('[Rule-Based Engine] Model Klasifikasi Berbasis Aturan Ambang Batas KKM 75 Siap Digunakan.');
}

module.exports = {
  trainModel,
  predictRisk
};
