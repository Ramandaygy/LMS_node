import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const OrtuChildren = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await api.get('/attendance/ortu/children');
      setChildren(res.data.children || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Data Anak Saya</h2>
      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
          {children.length > 0 ? (
            children.map(child => (
              <div key={child.id} style={{ padding: '20px', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{child.full_name}</h3>
                <p><strong>NIS:</strong> {child.nis}</p>
                <p><strong>Kelas:</strong> {child.class_name}</p>
              </div>
            ))
          ) : (
            <p>Belum ada data anak.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default OrtuChildren;
