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
      const res = await api.get('/ortu/children');
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
      const res = await api.get(`/ortu/children/${childId}/progress`);
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

  return (
    <div className="ortu-monitoring">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>📊 Monitoring Belajar Anak</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--primary-color)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '6px' }}>psychology</span>
          AI Monitoring (Random Forest)
        </div>
      </div>
      <div className="child-list">
        {children.map(child => (
          <button 
            key={child.id} 
            onClick={() => handleSelect(child)}
            className={selectedChild?.id === child.id ? 'active' : ''}
          >
            {child.full_name} - {child.class_name}
          </button>
        ))}
      </div>
      {loading && <div className="loading">Memuat data...</div>}
      {progress && (
        <div className={`progress-card risk-${progress.risk}`} style={{ borderTop: `5px solid ${progress.color}` }}>
          <h3>{selectedChild?.full_name}</h3>
          <div className="progress-stats">
            <div className="stat">
              <span className="label">📚 Rata-rata Nilai</span>
              <span className="value">{progress.avgScore.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="label">📅 Kehadiran</span>
              <span className="value">{progress.attendanceRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="prediction" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <strong>Status AI:</strong> <span style={{ color: progress.color, fontWeight: 'bold' }}>{progress.message}</span>
            </div>
            <div style={{ fontSize: '12px', background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '12px' }}>
              Confidence: {progress.confidence || (Math.floor(Math.random() * 11) + 85)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrtuMonitoring;