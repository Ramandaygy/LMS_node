import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const GradeInputPeriodDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [period, setPeriod] = useState(null);
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form edit period
  const [formData, setFormData] = useState({
    label: '',
    start_date: '',
    end_date: ''
  });

  // Data dropdown referensi
  const [teachers, setTeachers] = useState([]);
  
  // Modal akses khusus
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessForm, setAccessForm] = useState({
    teacher_id: '',
    subject_id: '',
    class_id: '',
    access_until: '',
    reason: ''
  });
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    fetchDetail();
    fetchTeachers();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/grade-input-periods/${id}`);
      if (res.data.success) {
        setPeriod(res.data.data.period);
        setAccesses(res.data.data.accesses);
        
        // init edit form
        const p = res.data.data.period;
        setFormData({
          label: p.label,
          start_date: p.start_date.split('T')[0],
          end_date: p.end_date.split('T')[0]
        });
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memuat detail periode');
      navigate('/dashboard/admin/grade-input-periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/users?role=guru');
      if (res.data.success) setTeachers(res.data.data);
    } catch (err) {}
  };

  const handleUpdatePeriod = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/grade-input-periods/${id}`, formData);
      if (res.data.success) {
        alert('Periode berhasil diperbarui');
        fetchDetail();
      }
    } catch (err) {
      alert('Gagal memperbarui periode');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePeriod = async () => {
    if (!window.confirm('Yakin ingin menghapus periode ini? Semua pengaturan akses khusus di dalamnya juga akan terhapus.')) return;
    try {
      const res = await api.delete(`/grade-input-periods/${id}`);
      if (res.data.success) {
        navigate('/dashboard/admin/grade-input-periods');
      }
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    setSavingAccess(true);
    try {
      const res = await api.post(`/grade-input-periods/${id}/access`, accessForm);
      if (res.data.success) {
        setShowAccessModal(false);
        setAccessForm({ teacher_id: '', subject_id: '', class_id: '', access_until: '', reason: '' });
        fetchDetail();
      }
    } catch (err) {
      alert('Gagal memberikan akses khusus');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleRevokeAccess = async (accessId) => {
    if (!window.confirm('Yakin cabut akses ini?')) return;
    try {
      const res = await api.delete(`/grade-input-periods/access/${accessId}`);
      if (res.data.success) fetchDetail();
    } catch (err) {
      alert('Gagal mencabut akses');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!period) return null;

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => navigate('/dashboard/admin/grade-input-periods')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          Kembali ke Daftar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Kolom Kiri: Edit Periode */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>edit_calendar</span>
            Edit Periode
          </h3>
          <form onSubmit={handleUpdatePeriod} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tahun Ajaran & Semester</label>
              <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                {period.academic_year_id?.year} - {period.academic_year_id?.semester === 'odd' ? 'Ganjil' : 'Genap'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Jenis Ujian</label>
              <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                {period.type.toUpperCase()}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Label / Nama Periode</label>
              <input 
                type="text" 
                value={formData.label}
                onChange={(e) => setFormData({...formData, label: e.target.value})}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Tanggal Mulai</label>
              <input 
                type="date" 
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>Tanggal Berakhir</label>
              <input 
                type="date" 
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={handleDeletePeriod} style={{ flex: 1, padding: '12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Hapus
              </button>
              <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

        {/* Kolom Kanan: Akses Khusus */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#10b981' }}>key</span>
              Hak Akses Khusus (Pengecualian)
            </h3>
            <button 
              onClick={() => setShowAccessModal(true)}
              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Beri Akses
            </button>
          </div>
          
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Bila ada guru yang tertinggal mengisi nilai karena alasan mendesak, Anda dapat memberikan perpanjangan waktu khusus untuk guru tersebut tanpa perlu membuka jadwal untuk seluruh sekolah.
          </p>

          {accesses.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8', fontSize: '14px' }}>
              Belum ada hak akses khusus yang diberikan.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {accesses.map(acc => (
                <div key={acc._id} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: acc.is_active ? '#fff' : '#f8fafc' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{acc.teacher_id?.full_name}</h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>
                      Batas Waktu: <strong style={{ color: acc.is_active ? '#0284c7' : '#94a3b8' }}>{new Date(acc.access_until).toLocaleString()}</strong>
                      {!acc.is_active && ' (Kadaluarsa)'}
                    </p>
                    {acc.reason && <p style={{ margin: 0, fontSize: '12px', fontStyle: 'italic', color: '#475569' }}>"{acc.reason}"</p>}
                  </div>
                  <button 
                    onClick={() => handleRevokeAccess(acc._id)}
                    style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cabut
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Beri Akses Khusus */}
      {showAccessModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '450px' }}>
            <h3 style={{ marginTop: 0 }}>Beri Perpanjangan Akses Khusus</h3>
            <form onSubmit={handleGrantAccess} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Pilih Guru</label>
                <select 
                  value={accessForm.teacher_id}
                  onChange={(e) => setAccessForm({...accessForm, teacher_id: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.full_name} ({t.nip || '-'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Batas Waktu (Sampai Kapan?)</label>
                <input 
                  type="datetime-local" 
                  value={accessForm.access_until}
                  onChange={(e) => setAccessForm({...accessForm, access_until: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Alasan / Catatan (Opsional)</label>
                <input 
                  type="text" 
                  value={accessForm.reason}
                  onChange={(e) => setAccessForm({...accessForm, reason: e.target.value})}
                  placeholder="Misal: Susulan anak sakit"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAccessModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={savingAccess} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{savingAccess ? 'Menyimpan...' : 'Beri Akses'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeInputPeriodDetail;
