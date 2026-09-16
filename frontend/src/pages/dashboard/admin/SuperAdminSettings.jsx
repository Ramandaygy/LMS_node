import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const SuperAdminSettings = () => {
  const [sysSettings, setSysSettings] = useState({
    app_name: 'LMS SMP NEGERI 1 SURADADI',
    maintenance_mode: false,
    session_timeout: '12',
    allow_reset_pwd: true,
    gemini_api_key: '',
  });

  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        setSysSettings(prev => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSysSettings({ ...sysSettings, [e.target.name]: value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/settings', sysSettings);
      if (res.data.success) {
        setSuccessMsg('Pengaturan sistem dan API Key berhasil disimpan!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg('Gagal menyimpan pengaturan: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div style={{ padding: '30px' }}>Memuat pengaturan...</div>;

  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
          SUPER ADMINISTRATOR
        </span>
        <h2 style={{ fontSize: '26px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
          Pengaturan Sistem Global
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
          Konfigurasikan preferensi global LMS, status pemeliharaan, kunci API Eksternal, dan bobot perhitungan nilai.
        </p>
      </div>

      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '14px', fontWeight: '600', marginBottom: '20px', maxWidth: '800px' }}>
          ✔ {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '14px', fontWeight: '600', marginBottom: '20px', maxWidth: '800px' }}>
          ❌ {errorMsg}
        </div>
      )}

      <div style={{ maxWidth: '800px', background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Nama Aplikasi (Brand)</label>
              <input
                type="text"
                name="app_name"
                value={sysSettings.app_name}
                onChange={handleChange}
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Batas Waktu Sesi Login (Jam)</label>
              <select
                name="session_timeout"
                value={sysSettings.session_timeout}
                onChange={handleChange}
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#fff' }}
              >
                <option value="2">2 Jam</option>
                <option value="6">6 Jam</option>
                <option value="12">12 Jam</option>
                <option value="24">24 Jam</option>
                <option value="168">7 Hari</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0ea5e9' }}>key</span>
              Google Gemini API Key
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>Dapatkan API Key secara gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>Google AI Studio</a>. Digunakan untuk fitur Generate Materi & Kuis AI.</p>
            <input
              type="text"
              name="gemini_api_key"
              placeholder="AIzaSy..."
              value={sysSettings.gemini_api_key}
              onChange={handleChange}
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>Mode Pemeliharaan (Maintenance Mode)</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Batasi akses hanya untuk Super Admin ketika sistem dimutakhirkan.</span>
              </div>
              <input
                type="checkbox"
                name="maintenance_mode"
                checked={sysSettings.maintenance_mode}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0284c7' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>Izinkan Reset Password Mandiri</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Izinkan pengguna meminta reset sandi melalui tautan email.</span>
              </div>
              <input
                type="checkbox"
                name="allow_reset_pwd"
                checked={sysSettings.allow_reset_pwd}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0284c7' }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{ marginTop: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '14px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span>
            Simpan Pengaturan Sistem
          </button>
        </form>
      </div>

    </div>
  );
};

export default SuperAdminSettings;
