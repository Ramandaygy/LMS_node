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
      <h2>📊 Monitoring Belajar Anak</h2>
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
          <div className="prediction">
            <strong>Status:</strong> {progress.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrtuMonitoring;