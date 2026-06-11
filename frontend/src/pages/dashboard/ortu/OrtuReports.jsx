import React from 'react';

const OrtuReports = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Laporan Akademik</h2>
      <div style={{ padding: '20px', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '10px' }}>receipt_long</span>
          <p>Laporan cetak semester sedang dalam tahap pengembangan.</p>
          <p>Silakan gunakan menu <strong>Monitoring AI</strong> untuk melihat evaluasi berjalan.</p>
        </div>
      </div>
    </div>
  );
};

export default OrtuReports;
