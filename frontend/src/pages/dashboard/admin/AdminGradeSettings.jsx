import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const AdminGradeSettings = () => {
  const [settings, setSettings] = useState({
    kkm_score: 75,
    weight_nh: 40,
    weight_uts: 30,
    weight_uas: 30,
    grade_input_status: 'auto'
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        setSettings({
          kkm_score: res.data.data.kkm_score || 75,
          weight_nh: res.data.data.weight_nh || 40,
          weight_uts: res.data.data.weight_uts || 30,
          weight_uas: res.data.data.weight_uas || 30,
          grade_input_status: res.data.data.grade_input_status || 'auto',
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat pengaturan penilaian.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    // Validasi Bobot
    const wNH = Number(settings.weight_nh);
    const wUTS = Number(settings.weight_uts);
    const wUAS = Number(settings.weight_uas);
    if (wNH + wUTS + wUAS !== 100) {
      setErrorMsg('Total Bobot Nilai (NH + PTS + PTA) harus tepat 100%.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSuccessMsg('Pengaturan Penilaian berhasil disimpan!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menyimpan pengaturan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #0284c7', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', tracking: '0.5px' }}>
            MANAJEMEN AKADEMIK
          </span>
          <h2 style={{ fontSize: '22px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
            Konfigurasi Penilaian
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
            Konfigurasi parameter penilaian akademik secara global untuk perhitungan hasil akhir.
          </p>
        </div>

        {successMsg && (
          <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
            ✔ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
            ✖ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* KKM */}
          <div>
            <h3 style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '18px' }}>trending_up</span>
              Batas KKM (Kriteria Ketuntasan Minimal)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '300px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Batas Nilai KKM / Standar Ketuntasan</label>
              <input
                type="number"
                name="kkm_score"
                value={settings.kkm_score}
                onChange={handleChange}
                min="0" max="100"
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Digunakan sebagai indikator dalam Early Warning System (Sistem Peringatan Dini).</p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

          {/* Bobot Nilai */}
          <div>
            <h3 style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '18px' }}>percent</span>
              Bobot Perhitungan Rapor
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Bobot Nilai Harian / Tugas (%)</label>
                <input
                  type="number"
                  name="weight_nh"
                  value={settings.weight_nh}
                  onChange={handleChange}
                  min="0" max="100"
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Bobot PTS (%)</label>
                <input
                  type="number"
                  name="weight_uts"
                  value={settings.weight_uts}
                  onChange={handleChange}
                  min="0" max="100"
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Bobot PTA (%)</label>
                <input
                  type="number"
                  name="weight_uas"
                  value={settings.weight_uas}
                  onChange={handleChange}
                  min="0" max="100"
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>
          </div>


          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: '16px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', width: 'fit-content' }}
          >
            {submitting ? (
              <>Menyimpan...</>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span>
                Simpan Konfigurasi Penilaian
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminGradeSettings;
