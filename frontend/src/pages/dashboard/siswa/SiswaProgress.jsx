import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-progress.css';

const SiswaProgress = () => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('grades'); // 'grades' or 'assignments'
  const [hoveredPoint, setHoveredPoint] = useState(null);

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

  const getScoreBadgeClass = (score) => {
    if (score >= 80) return 'score-badge high';
    if (score >= 60) return 'score-badge medium';
    return 'score-badge low';
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

  // SVG Chart Calculation
  const renderSVGChart = () => {
    const timeline = progress.timeline || [];
    if (timeline.length === 0) {
      return <div className="empty-chart" style={{ padding: '60px 0', color: '#64748b', textAlign: 'center' }}>Belum ada data nilai untuk membuat grafik perkembangan.</div>;
    }

    const svgWidth = 600;
    const svgHeight = 250;
    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 30;
    const paddingBottom = 45;
    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const points = timeline.map((p, index) => {
      const x = paddingLeft + (timeline.length > 1 ? (index / (timeline.length - 1)) * chartWidth : chartWidth / 2);
      const y = paddingTop + chartHeight - (p.score / 100) * chartHeight;
      return { x, y, ...p };
    });

    const linePath = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : '';

    const gridY = [0, 25, 50, 75, 100];

    return (
      <div className="chart-container-wrapper">
        {hoveredPoint && (
          <div className="chart-tooltip">
            <p><strong>{hoveredPoint.title}</strong></p>
            <p>Nilai: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{hoveredPoint.score}%</span></p>
            <p>Tanggal: {hoveredPoint.date}</p>
          </div>
        )}
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="progress-svg-chart" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Grid lines */}
          {gridY.map((val) => {
            const y = paddingTop + chartHeight - (val / 100) * chartHeight;
            return (
              <g key={val}>
                <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="600">{val}%</text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

          {/* Connection Line */}
          {linePath && <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#shadow)" />}

          {/* Data Points */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint && hoveredPoint.x === pt.x ? 7 : 4.5}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth="3"
              style={{ cursor: 'pointer', transition: 'r 0.2s ease, fill 0.2s ease' }}
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* X Axis Labels */}
          {points.length > 0 && points.filter((_, idx) => {
            if (points.length <= 6) return true;
            return idx % Math.ceil(points.length / 5) === 0 || idx === points.length - 1;
          }).map((pt, idx) => (
            <text key={idx} x={pt.x} y={svgHeight - 15} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">{pt.date}</text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="progress-container">
      <div className="page-header">
        <h2>Progres Belajar Saya</h2>
        <p>Pantau perkembangan akademik, kehadiran kelas, dan analisis rekomendasi belajar berbasis AI.</p>
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
              <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
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
            <h4>Saran Tindakan:</h4>
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

        {/* Kolom Kanan: Metrics Grid & Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', overflow: 'hidden' }}>
          {/* Top Metrics Grid */}
          <div className="metrics-grid">
            
            <div className="metric-card-modern">
              <div className="metric-header">
                <h3>Rata-rata Nilai Tugas</h3>
                <div className="metric-icon blue">
                  <span className="material-symbols-outlined">grade</span>
                </div>
              </div>
              <div className="metric-value-large">{progress.avgScore.toFixed(1)}%</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(progress.avgScore, 100)}%`, backgroundColor: getFillColor(progress.avgScore) }}></div>
              </div>
              <p className="metric-desc">Gabungan nilai seluruh pengumpulan tugas</p>
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
              <p className="metric-desc">Materi pembelajaran yang sudah dibaca</p>
            </div>

          </div>

          {/* Details Section: Line Chart & Grades List */}
          <div className="progress-details-grid">
            {/* 1. Line Chart Card */}
            <div className="chart-card">
              <h3 className="chart-title">
                <span className="material-symbols-outlined">show_chart</span>
                Grafik Perkembangan Nilai
              </h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '-10px 0 20px 0', lineHeight: 1.4 }}>Arahkan kursor pada bulatan grafik untuk melihat detail nilai tugas dan ujian.</p>
              {renderSVGChart()}
            </div>

            {/* 2. Detailed Grades Card */}
            <div className="grades-card">
              <h3 className="grades-title">
                <span className="material-symbols-outlined">assignment</span>
                Daftar Nilai Lengkap
              </h3>
              
              <div className="grades-tabs">
                <button className={`tab-btn ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>
                  Ujian & Kuis
                </button>
                <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
                  Nilai Tugas
                </button>
              </div>

              <div className="grades-table-wrapper">
                {activeTab === 'grades' ? (
                  <table className="grades-table">
                    <thead>
                      <tr>
                        <th>Mata Pelajaran</th>
                        <th>Tipe</th>
                        <th>Nilai</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!progress.detailedGrades || progress.detailedGrades.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Belum ada nilai ujian yang diinput guru.</td></tr>
                      ) : (
                        progress.detailedGrades.map((g) => (
                          <tr key={g._id}>
                            <td style={{ fontWeight: 600 }}>{g.subject_name}</td>
                            <td><span className="type-badge">{g.type}</span></td>
                            <td><span className={getScoreBadgeClass(g.score)}>{g.score}</span></td>
                            <td style={{ color: '#64748b', fontSize: '12px' }}>{g.note || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="grades-table">
                    <thead>
                      <tr>
                        <th>Nama Tugas</th>
                        <th>Skor</th>
                        <th>Persentase</th>
                        <th>Tanggal Kumpul</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!progress.detailedAssignments || progress.detailedAssignments.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Belum ada tugas yang dikumpulkan dan dinilai.</td></tr>
                      ) : (
                        progress.detailedAssignments.map((a) => (
                          <tr key={a._id}>
                            <td style={{ fontWeight: 600 }}>{a.title}</td>
                            <td>{a.score}/{a.max_score}</td>
                            <td><span className={getScoreBadgeClass(a.pct)}>{a.pct}%</span></td>
                            <td style={{ color: '#64748b', fontSize: '12px' }}>{new Date(a.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SiswaProgress;
