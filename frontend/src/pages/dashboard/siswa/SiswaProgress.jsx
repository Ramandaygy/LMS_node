import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-progress.css';

const SiswaProgress = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await api.get('/progress/me');
      setProgress(res.data.data);
    } catch (err) {
      setError('Gagal memuat data progress: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="progress-container"><div className="loading">Memuat data...</div></div>;
  if (error) return <div className="progress-container"><div className="error-message">{error}</div></div>;
  if (!progress) return <div className="progress-container"><div className="loading">Data tidak tersedia</div></div>;

  const getFillColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Generate readable explanation based on metrics
  const getAIExplanation = () => {
    if (progress.risk === 'high') {
      let reasons = [];
      if (progress.avgScore < 70) reasons.push("Rata-rata nilai tugas/kuis berada di bawah standar");
      if (progress.attendanceRate < 75) reasons.push("Persentase kehadiran sangat rendah");
      if (progress.materialCompletionRate < 50) reasons.push("Sebagian besar materi pembelajaran belum dipelajari");
      
      if (reasons.length === 0) reasons.push("Pola aktivitas belajar menunjukkan tren penurunan");

      return `AI memprediksi Status Risiko TINGGI karena: ${reasons.join(' dan ')}. Segera ambil tindakan untuk memperbaiki performa Anda agar tidak tertinggal.`;
    } 
    else if (progress.risk === 'medium') {
      let reasons = [];
      if (progress.avgScore >= 70 && progress.avgScore < 80) reasons.push("Nilai tugas/kuis cukup, namun masih bisa dimaksimalkan");
      if (progress.attendanceRate < 90 && progress.attendanceRate >= 75) reasons.push("Kehadiran perlu ditingkatkan");
      if (progress.materialCompletionRate < 80 && progress.materialCompletionRate >= 50) reasons.push("Ada beberapa materi yang belum diselesaikan");
      
      if (reasons.length === 0) reasons.push("Pola belajar cukup stabil, namun ada ruang untuk peningkatan");

      return `AI memprediksi Status Risiko SEDANG karena: ${reasons.join(', ')}. Tingkatkan lagi fokus belajar Anda.`;
    }
    else {
      return `AI memprediksi Status Risiko RENDAH (Aman). Semua indikator (Nilai, Kehadiran, Materi) menunjukkan performa yang sangat baik. Pertahankan!`;
    }
  };

  return (
    <div className="progress-container">
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <h2>Progres Belajar Saya</h2>
      </div>
      
      <div className="progress-dashboard">
        
        {/* Kolom Kiri: AI Analysis */}
        <div className={`ai-analysis-card risk-${progress.color}`}>
          <div className="ai-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>psychology</span>
            Analisis Random Forest AI
          </div>

          <div className="risk-status-container">
            <div className="risk-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>
                {progress.risk === 'high' ? 'warning' : progress.risk === 'medium' ? 'info' : 'verified'}
              </span>
            </div>
            <p className="risk-title">Prediksi Status Risiko</p>
            <p className="risk-value">{progress.risk.toUpperCase()}</p>
          </div>

          <div className="ai-explanation">
            <h4><span className="material-symbols-outlined">insights</span> Penjelasan AI</h4>
            <p>{getAIExplanation()}</p>
          </div>

          <div className="recommendations">
            <h4 style={{ marginBottom: '15px', color: '#334155' }}>Saran Tindakan:</h4>
            <ul className="recommendation-list">
              {progress.risk === 'high' && (
                <>
                  <li><span className="material-symbols-outlined">menu_book</span> Hubungi guru wali kelas untuk konsultasi nilai.</li>
                  <li><span className="material-symbols-outlined">event_available</span> Pastikan Anda selalu hadir di jadwal pelajaran.</li>
                </>
              )}
              {progress.risk === 'medium' && (
                <>
                  <li><span className="material-symbols-outlined">task_alt</span> Selesaikan sisa materi dan tugas yang belum dikerjakan.</li>
                  <li><span className="material-symbols-outlined">trending_up</span> Usahakan mendapat nilai lebih tinggi pada tugas berikutnya.</li>
                </>
              )}
              {progress.risk === 'low' && (
                <>
                  <li><span className="material-symbols-outlined">emoji_events</span> Pertahankan rutinitas belajar Anda yang sudah efektif.</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Kolom Kanan: Metrics Grid */}
        <div className="metrics-grid">
          
          <div className="metric-card-modern">
            <div className="metric-header">
              <h3>Rata-rata Nilai</h3>
              <div className="metric-icon blue">
                <span className="material-symbols-outlined">grade</span>
              </div>
            </div>
            <div className="metric-value-large">{progress.avgScore.toFixed(1)}%</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(progress.avgScore, 100)}%`, backgroundColor: getFillColor(progress.avgScore) }}></div>
            </div>
            <p className="metric-desc">Gabungan nilai tugas dan kuis</p>
          </div>

          <div className="metric-card-modern">
            <div className="metric-header">
              <h3>Kehadiran</h3>
              <div className="metric-icon purple">
                <span className="material-symbols-outlined">how_to_reg</span>
              </div>
            </div>
            <div className="metric-value-large">{progress.attendanceRate.toFixed(1)}%</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(progress.attendanceRate, 100)}%`, backgroundColor: getFillColor(progress.attendanceRate) }}></div>
            </div>
            <p className="metric-desc">Persentase kehadiran di kelas</p>
          </div>

          <div className="metric-card-modern">
            <div className="metric-header">
              <h3>Penyelesaian Materi</h3>
              <div className="metric-icon orange">
                <span className="material-symbols-outlined">library_books</span>
              </div>
            </div>
            <div className="metric-value-large">{progress.materialCompletionRate.toFixed(1)}%</div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(progress.materialCompletionRate, 100)}%`, backgroundColor: getFillColor(progress.materialCompletionRate) }}></div>
            </div>
            <p className="metric-desc">Materi yang sudah dibaca/selesai</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SiswaProgress;
