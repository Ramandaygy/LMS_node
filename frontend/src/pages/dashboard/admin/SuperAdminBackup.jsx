import React, { useState, useRef } from 'react';
import api from '../../../services/api';

const SuperAdminBackup = () => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const response = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lms_database_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Backup database berhasil diexport dan diunduh!');
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal melakukan export backup database.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setErrorMsg('File backup harus berupa format JSON!');
      return;
    }

    if (!window.confirm('PERINGATAN: Memulihkan database akan menimpa data yang ada saat ini. Apakah Anda yakin ingin melanjutkan?')) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('backup', file);

      const res = await api.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg('Database berhasil dipulihkan (restore) sepenuhnya!');
      } else {
        setErrorMsg(res.data.message || 'Gagal memulihkan database.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Gagal memulihkan database.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
          SUPER ADMINISTRATOR
        </span>
        <h2 style={{ fontSize: '26px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
          Cadangan & Pemulihan Basis Data (Backup & Restore)
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
          Ekspor semua data transaksi, modul, user, dan absensi sekolah ke dalam file cadangan JSON eksternal, atau pulihkan kondisi database dari cadangan sebelumnya.
        </p>
      </div>

      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '14px', fontWeight: '600', marginBottom: '20px', maxWidth: '600px' }}>
          ✔ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '14px', fontWeight: '600', marginBottom: '20px', maxWidth: '600px' }}>
          ✖ {errorMsg}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '800px' }}>
        
        {/* Card Export */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>download</span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Ekspor Database</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6, flex: 1 }}>
            Unduh seluruh kumpulan data MongoDB (Siswa, Guru, Modul, Absensi, Nilai) ke dalam satu file berkas JSON terenkripsi lokal di perangkat Anda.
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'Memproses...' : 'Mulai Ekspor (JSON)'}
          </button>
        </div>

        {/* Card Restore */}
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>upload</span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Pulihkan Database</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6, flex: 1 }}>
            Unggah file backup JSON resmi yang telah dibuat sebelumnya. Ini akan menimpa seluruh isi database aktif dengan data dari cadangan tersebut.
          </p>
          <button
            onClick={handleRestoreClick}
            disabled={loading}
            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'Memproses...' : 'Mulai Pulihkan (JSON)'}
          </button>
        </div>

      </div>

    </div>
  );
};

export default SuperAdminBackup;
