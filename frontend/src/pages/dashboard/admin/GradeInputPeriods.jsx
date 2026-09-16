import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const GradeInputPeriods = () => {
  const [periods, setPeriods] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    academic_year_id: '',
    type: 'tugas',
    label: '',
    start_date: '',
    end_date: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [selectedYear]);

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/academic-years');
      const rawData = res.data?.data || res.data?.academic_years || res.data || [];
      const dataList = Array.isArray(rawData) ? rawData : [];
      setAcademicYears(dataList);
      
      const activeYear = dataList.find(y => y.is_active) || dataList[0];
      if (activeYear) {
        setSelectedYear(prev => prev || activeYear._id);
        setFormData(prev => ({ ...prev, academic_year_id: prev.academic_year_id || activeYear._id }));
      }
    } catch (err) {
      console.error(err);
      setAcademicYears([]);
    }
  };

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/grade-input-periods?academic_year_id=${selectedYear}`);
      const rawData = res.data?.data || res.data || [];
      setPeriods(Array.isArray(rawData) ? rawData : []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat periode penginputan nilai.');
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData(prev => ({ ...prev, label: '', start_date: '', end_date: '', type: 'tugas' }));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/grade-input-periods', formData);
      if (res.data.success) {
        setShowModal(false);
        fetchPeriods();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan periode');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div>
            <span style={{ background: '#eff6ff', color: '#0284c7', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
              MANAJEMEN AKADEMIK
            </span>
            <h2 style={{ fontSize: '22px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
              Periode Penginputan Nilai
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Atur jadwal buka/tutup penginputan nilai berdasarkan jenis ujian.
            </p>
          </div>
          <button 
            onClick={handleOpenModal}
            style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Tambah Periode
          </button>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Filter Tahun Ajaran:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          >
            <option value="">Semua Tahun Ajaran</option>
            {(academicYears || []).map(ay => (
              <option key={ay._id} value={ay._id}>{ay.year} - {ay.semester === 'odd' ? 'Ganjil' : 'Genap'} {ay.is_active ? '(Aktif)' : ''}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : errorMsg ? (
          <div style={{ color: 'red', textAlign: 'center' }}>{errorMsg}</div>
        ) : (!periods || periods.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Belum ada periode penginputan nilai untuk tahun ajaran ini.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Jenis Ujian</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Tanggal Mulai</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Tanggal Berakhir</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(periods || []).map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{p.label} <br/><span style={{fontSize: '11px', color: '#64748b'}}>{p.type.toUpperCase()}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{new Date(p.start_date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{new Date(p.end_date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.is_open ? (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Aktif (Terbuka)</span>
                    ) : (
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Tertutup</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button 
                      onClick={() => navigate(`/dashboard/admin/grade-input-periods/${p._id}`)}
                      style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                    >
                      Kelola Akses & Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tambah */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Tambah Periode Baru</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Jenis Ujian</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="tugas">Nilai Harian / Tugas</option>
                  <option value="uts">PTS (Ujian Tengah Semester)</option>
                  <option value="uas">PTA (Ujian Akhir Semester)</option>
                  <option value="ulangan">Ulangan Harian</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Label (Contoh: Input Nilai PTS Ganjil)</label>
                <input 
                  type="text" 
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Tanggal Mulai</label>
                  <input 
                    type="date" 
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Tanggal Berakhir</label>
                  <input 
                    type="date" 
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeInputPeriods;
