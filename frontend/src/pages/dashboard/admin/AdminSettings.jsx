import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    school_name: '',
    school_address: '',
    contact_phone: '',
    contact_email: '',
    headmaster_name: '',
    headmaster_nip: '',
    signature_date: '',
    academic_year: '',
    semester: 'Ganjil',
    school_logo: ''
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
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat pengaturan kop surat.');
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
    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSuccessMsg('Pengaturan Kop Surat berhasil disimpan!');
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
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '28px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <span style={{ background: '#eff6ff', color: '#0284c7', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', tracking: '0.5px' }}>
            ADMINISTRASI TATA USAHA
          </span>
          <h2 style={{ fontSize: '24px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
            Pengaturan Kop Surat Dinamis
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
            Sesuaikan informasi kop surat resmi sekolah yang digunakan pada cetakan rapor, laporan, dan dokumen resmi lainnya.
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
          
          {/* Bagian Instansi */}
          <div>
            <h3 style={{ fontSize: '16px', color: '#0f172a', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '20px' }}>school</span>
              Detail Sekolah / Instansi
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Nama Sekolah</label>
                <input
                  type="text"
                  name="school_name"
                  value={settings.school_name}
                  onChange={handleChange}
                  placeholder="e.g. SMP NEGERI 1 SURADADI"
                  required
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Alamat Sekolah</label>
                <input
                  type="text"
                  name="school_address"
                  value={settings.school_address}
                  onChange={handleChange}
                  placeholder="e.g. Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal"
                  required
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Nomor Telepon Kontak</label>
                  <input
                    type="text"
                    name="contact_phone"
                    value={settings.contact_phone}
                    onChange={handleChange}
                    placeholder="e.g. (0283) 123456"
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Email Kontak</label>
                  <input
                    type="email"
                    name="contact_email"
                    value={settings.contact_email}
                    onChange={handleChange}
                    placeholder="e.g. smpn1suradadi@sch.id"
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>URL Logo Sekolah (Opsional)</label>
                <input
                  type="text"
                  name="school_logo"
                  value={settings.school_logo}
                  onChange={handleChange}
                  placeholder="e.g. /Logosmp.jpg"
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9' }} />

          {/* Bagian Kepala Sekolah & TTD */}
          <div>
            <h3 style={{ fontSize: '16px', color: '#0f172a', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '20px' }}>assignment_ind</span>
              Kepala Sekolah & Penandatanganan
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Nama Kepala Sekolah</label>
                  <input
                    type="text"
                    name="headmaster_name"
                    value={settings.headmaster_name}
                    onChange={handleChange}
                    placeholder="e.g. Drs. H. Mulyono, M.Pd."
                    required
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    name="headmaster_nip"
                    value={settings.headmaster_nip}
                    onChange={handleChange}
                    placeholder="e.g. 19670812 199303 1 004"
                    required
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Tanggal Tanda Tangan Rapor</label>
                  <input
                    type="text"
                    name="signature_date"
                    value={settings.signature_date}
                    onChange={handleChange}
                    placeholder="e.g. 19 Juni 2026"
                    required
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Tahun Ajaran Aktif</label>
                    <input
                      type="text"
                      name="academic_year"
                      value={settings.academic_year}
                      onChange={handleChange}
                      placeholder="e.g. 2025/2026"
                      required
                      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Semester</label>
                    <select
                      name="semester"
                      value={settings.semester}
                      onChange={handleChange}
                      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#fff' }}
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={submitting}
            style={{ marginTop: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '14px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
          >
            {submitting ? (
              <>Mengarsipkan...</>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span>
                Simpan Perubahan Kop Surat
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
