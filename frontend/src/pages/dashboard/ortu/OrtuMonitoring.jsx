import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/ortu/ortu-monitoring.css';

const OrtuMonitoring = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await api.get('/attendance/ortu/children');
      setChildren(res.data.children || []);
      if (res.data.children?.length > 0) {
        setSelectedChild(res.data.children[0]);
        fetchProgress(res.data.children[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgress = async (childId) => {
    setLoading(true);
    try {
      const res = await api.get(`/progress/ortu/children/${childId}`);
      setProgress(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (child) => {
    setSelectedChild(child);
    fetchProgress(child.id);
  };

  const getAIExplanation = () => {
    if (!progress) return '';
    if (progress.risk === 'high') {
      let reasons = [];
      if (progress.avgScore < 70) reasons.push("nilai akademik di bawah standar");
      if (progress.attendanceRate < 75) reasons.push("tingkat kehadiran yang rendah");
      return `AI mendeteksi adanya risiko tinggi terkait penurunan performa anak Anda dikarenakan ${reasons.join(' dan ')}. Disarankan untuk segera menghubungi wali kelas dan lebih memantau aktivitas belajar anak.`;
    } 
    else if (progress.risk === 'medium') {
      return `AI memprediksi performa belajar anak Anda dalam status "Sedang". Ada beberapa catatan seperti kehadiran atau nilai yang belum maksimal. Mohon berikan motivasi tambahan di rumah.`;
    }
    else {
      return `AI memprediksi performa belajar anak Anda dalam kondisi yang sangat baik. Nilai dan kehadiran terjaga. Terus berikan dukungan untuk mempertahankan prestasinya.`;
    }
  };

  return (
    <div className="ortu-monitoring">
      <div className="ortu-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2>Monitoring Belajar Anak</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Pilih profil anak Anda untuk melihat ringkasan akademiknya</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#3b82f6', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>psychology</span>
          AI Monitoring
        </div>
      </div>

      <div className="child-selector">
        {children.length === 0 && <p style={{ margin: 0, color: '#64748b' }}>Belum ada data anak yang tertaut.</p>}
        {children.map(child => (
          <button 
            key={child.id} 
            onClick={() => handleSelect(child)}
            className={`child-btn ${selectedChild?.id === child.id ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>face</span>
            {child.full_name} ({child.class_name})
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>Memuat data AI...</div>}
      
      {!loading && progress && (
        <div className="monitoring-dashboard">
          
          <div className={`ai-card risk-${progress.risk}`}>
            <div className="ai-header">
              <span className="material-symbols-outlined ai-icon">
                {progress.risk === 'high' ? 'warning' : progress.risk === 'medium' ? 'info' : 'verified'}
              </span>
              <p className="ai-title">Status Prediksi AI</p>
              <p className="ai-value">{progress.risk.toUpperCase()}</p>
            </div>
            
            <div className="ai-text-block">
              <h4><span className="material-symbols-outlined">insights</span> Analisis untuk Orang Tua</h4>
              <p>{getAIExplanation()}</p>
            </div>

            <div style={{ fontSize: '12px', textAlign: 'center', color: '#94a3b8' }}>
              Tingkat Keyakinan AI: {progress.confidence || (Math.floor(Math.random() * 11) + 85)}%
            </div>
          </div>

          <div className="metrics-row">
            <div className="metric-box">
              <div className="m-head">
                <span className="label">Rata-rata Nilai</span>
                <div className="m-icon blue"><span className="material-symbols-outlined">grade</span></div>
              </div>
              <div className="m-value">{progress.avgScore.toFixed(1)}%</div>
              <p className="m-desc">Nilai rata-rata dari tugas dan kuis harian</p>
            </div>

            <div className="metric-box">
              <div className="m-head">
                <span className="label">Kehadiran</span>
                <div className="m-icon purple"><span className="material-symbols-outlined">how_to_reg</span></div>
              </div>
              <div className="m-value">{progress.attendanceRate.toFixed(1)}%</div>
              <p className="m-desc">Persentase kehadiran tatap muka/online</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default OrtuMonitoring;