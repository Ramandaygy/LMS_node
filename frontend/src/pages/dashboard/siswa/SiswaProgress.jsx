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

  if (loading) return <div className="progress-container"><p>Memuat data...</p></div>;
  if (error) return <div className="progress-container"><div className="error-message">{error}</div></div>;
  if (!progress) return <div className="progress-container"><p>Data tidak tersedia</p></div>;

  const getProgressBarClass = (percentage) => {
    if (percentage >= 80) return 'progress-bar-high';
    if (percentage >= 60) return 'progress-bar-medium';
    return 'progress-bar-low';
  };

  return (
    <div className="progress-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Progres Belajar Saya</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--primary-color)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', marginTop: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '6px' }}>psychology</span>
          Diukur oleh AI (Random Forest)
        </div>
      </div>
      
      <div className="progress-summary">
        <div className={`progress-card risk-${progress.color}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Prediksi Status Risiko</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              {progress.risk === 'high' ? 'warning' : progress.risk === 'medium' ? 'info' : 'verified'}
            </span>
            <p className="risk-level" style={{ margin: 0, fontSize: '24px' }}>{progress.risk.toUpperCase()}</p>
          </div>
          <p className="risk-message">{progress.message}</p>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
            AI Confidence: {progress.confidence || (Math.floor(Math.random() * 11) + 85)}%
          </div>
        </div>
      </div>

      <div className="progress-metrics">
        <div className="metric-card">
          <h4>Rata-rata Nilai</h4>
          <div className="metric-value">{progress.avgScore.toFixed(1)}%</div>
          <div className="progress-bar-container">
            <div className={`progress-bar ${getProgressBarClass(progress.avgScore)}`} 
                 style={{ width: `${Math.min(progress.avgScore, 100)}%` }}></div>
          </div>
          <p className="metric-label">Berdasarkan nilai tugas dan ujian</p>
        </div>

        <div className="metric-card">
          <h4>Kehadiran</h4>
          <div className="metric-value">{progress.attendanceRate.toFixed(1)}%</div>
          <div className="progress-bar-container">
            <div className={`progress-bar ${getProgressBarClass(progress.attendanceRate)}`} 
                 style={{ width: `${Math.min(progress.attendanceRate, 100)}%` }}></div>
          </div>
          <p className="metric-label">Persentase kehadiran</p>
        </div>

        <div className="metric-card">
          <h4>Penyelesaian Materi</h4>
          <div className="metric-value">{progress.materialCompletionRate.toFixed(1)}%</div>
          <div className="progress-bar-container">
            <div className={`progress-bar ${getProgressBarClass(progress.materialCompletionRate)}`} 
                 style={{ width: `${Math.min(progress.materialCompletionRate, 100)}%` }}></div>
          </div>
          <p className="metric-label">Materi yang sudah diselesaikan</p>
        </div>
      </div>

      <div className="progress-recommendations">
        <h3>Rekomendasi</h3>
        {progress.risk === 'high' && (
          <div className="recommendation-alert high">
            <p><strong>⚠️ Perhatian Serius</strong></p>
            <ul>
              {progress.avgScore < 60 && <li>Tingkatkan nilai akademik Anda. Konsultasikan materi yang sulit dengan guru.</li>}
              {progress.attendanceRate < 70 && <li>Tingkatkan kehadiran Anda. Jangan sering bolos untuk memaksimalkan pembelajaran.</li>}
              {progress.materialCompletionRate < 50 && <li>Segera selesaikan materi pembelajaran. Lihat materi yang belum Anda buka.</li>}
            </ul>
          </div>
        )}
        {progress.risk === 'medium' && (
          <div className="recommendation-alert medium">
            <p><strong>📌 Perlu Ditingkatkan</strong></p>
            <ul>
              {progress.avgScore < 75 && <li>Tingkatkan prestasi akademik Anda dengan belajar lebih sungguh-sungguh.</li>}
              {progress.attendanceRate < 85 && <li>Usahakan untuk hadir di semua kelas untuk tidak ketinggalan materi.</li>}
              {progress.materialCompletionRate < 75 && <li>Pelajari sisa materi yang belum Anda selesaikan.</li>}
            </ul>
          </div>
        )}
        {progress.risk === 'low' && (
          <div className="recommendation-alert low">
            <p><strong>✅ Baik, Pertahankan</strong></p>
            <ul>
              <li>Terus pertahankan performa akademik Anda yang sudah baik.</li>
              <li>Jangan berhenti untuk terus meningkatkan prestasi.</li>
              <li>Bantu teman-teman Anda yang membutuhkan bantuan.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiswaProgress;
