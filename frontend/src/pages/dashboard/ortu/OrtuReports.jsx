import React from 'react';

const OrtuReports = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', color: '#0f172a', fontWeight: 'bold', margin: '0 0 8px 0' }}>Laporan Akademik</h2>
        <p style={{ margin: 0, color: '#64748b' }}>Unduh laporan cetak performa akademik semester</p>
      </div>
      
      <div style={{ padding: '40px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1', marginTop: '20px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: '#64748b' }}>
          <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#3b82f6' }}>receipt_long</span>
          </div>
          <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '20px' }}>Fitur Sedang Dikembangkan</h3>
          <p style={{ margin: '0 0 20px 0', maxWidth: '400px', lineHeight: '1.6' }}>Laporan cetak semester sedang dalam tahap pengembangan. Kami akan segera merilisnya.</p>
          <div style={{ background: '#eff6ff', color: '#1e40af', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}>
            Silakan gunakan menu <strong>Monitoring AI</strong> untuk melihat evaluasi harian berjalan.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrtuReports;
