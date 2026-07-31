import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-schedule.css';

const SiswaSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedScheduleModal, setSelectedScheduleModal] = useState(null);
  const [modalMaterials, setModalMaterials] = useState([]);
  const [modalTasks, setModalTasks] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  const [timeSlots] = useState([
    { slot: 1, label: '07:20-08:00' },
    { slot: 2, label: '08:00-08:40' },
    { slot: 3, label: '08:40-09:20' },
    { slot: 4, label: '09:40-10:20' },
    { slot: 5, label: '10:20-11:00' },
    { slot: 6, label: '11:00-11:40' },
    { slot: 7, label: '12:10-12:50' },
    { slot: 8, label: '12:50-13:30' },
  ]);

  const [days] = useState(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schedules/siswa/weekly');
      if (res.data.success) {
        setSchedules(res.data.schedule || []);
      } else {
        setMessage({ type: 'error', text: 'Gagal memuat jadwal' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat jadwal' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScheduleModal = async (sch) => {
    setSelectedScheduleModal(sch);
    setLoadingModalData(true);
    setModalMaterials([]);
    setModalTasks([]);
    try {
      const subjectId = sch.subject_id?._id || sch.subject_id;

      const [mRes, tRes] = await Promise.allSettled([
        api.get('/materials'),
        api.get('/assignments/student/my-assignments')
      ]);

      if (mRes.status === 'fulfilled') {
        const allMats = mRes.value.data.data || mRes.value.data.materials || [];
        setModalMaterials(allMats.filter(m => {
          const mSub = (m.subject_id?._id || m.subject_id || '').toString();
          const targetSub = (subjectId || '').toString();
          return mSub === targetSub || (m.title && sch.subject_id?.name && m.title.toLowerCase().includes(sch.subject_id.name.toLowerCase()));
        }));
      }

      if (tRes.status === 'fulfilled') {
        const allTasks = tRes.value.data.assignments || tRes.value.data.data || [];
        setModalTasks(allTasks.filter(t => {
          const tSub = (t.subject_id?._id || t.subject_id || '').toString();
          const targetSub = (subjectId || '').toString();
          return tSub === targetSub || (t.title && sch.subject_id?.name && t.title.toLowerCase().includes(sch.subject_id.name.toLowerCase()));
        }));
      }
    } catch (err) {
      console.error('Error loading modal session details:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const getMapelColor = (subjectId) => {
    if (!subjectId) return '#f1f5f9';
    const colors = [
      '#e8f4f8', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5',
      '#e0f7fa', '#ffebee', '#e0f2f1', '#f9fbe7', '#fde0dc'
    ];
    let hash = 0;
    const str = subjectId.toString();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Build a lookup map for easy rendering
  const scheduleMap = {};
  schedules.forEach(item => {
    let slot = item.time_slot;
    if (!slot && item.start_time) {
      const slotIndex = timeSlots.findIndex(t => t.label.split('-')[0].trim() === item.start_time);
      slot = slotIndex + 1;
    }
    if (slot && item.day) {
      scheduleMap[`${item.day}_${slot}`] = item;
    }
  });

  if (loading) return <div className="admin-loading" style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Memuat jadwal...</div>;

  return (
    <div className="schedule-compact" style={{ padding: '20px' }}>
      <div className="compact-header" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', color: '#1e293b', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>Jadwal Pelajaran & Pertemuan Saya</h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Klik pada kartu jadwal untuk langsung membuka materi ajar dan tugas kelas.</p>
      </div>

      {message.text && (
        <div className={`compact-alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="compact-table-wrapper" style={{ borderRadius: '16px', overflowX: 'auto', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', background: '#fff', border: '1px solid #cbd5e1' }}>
        <table className="compact-schedule" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '2px solid #e2e8f0', color: '#ffffff' }}>
              <th style={{ width: '15%', padding: '16px', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>Hari</th>
              <th style={{ width: '18%', padding: '16px', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>Waktu KBM</th>
              <th style={{ width: '67%', padding: '16px', textAlign: 'left', fontWeight: '800', fontSize: '13px' }}>Mata Pelajaran, Guru & Akses Sesi</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <React.Fragment key={day}>
                {timeSlots.map((slot, index) => {
                  const item = scheduleMap[`${day}_${slot.slot}`];
                  let bgColor = '#fff';
                  let subjectName = '—';
                  let teacherName = '-';
                  
                  if (item) {
                    const subject = item.subject_id;
                    const teacher = item.teacher_id;
                    bgColor = getMapelColor(subject ? subject._id : '');
                    subjectName = subject ? (subject.name || subject.code) : '—';
                    if (teacher) {
                      teacherName = teacher.full_name || teacher.username || teacher.teacher_code || '-';
                    }
                  }

                  return (
                    <tr key={`${day}_${slot.slot}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {index === 0 && (
                        <td 
                          rowSpan={timeSlots.length} 
                          style={{ 
                            verticalAlign: 'middle', 
                            fontWeight: '800', 
                            backgroundColor: '#f8fafc', 
                            borderRight: '1px solid #cbd5e1', 
                            textAlign: 'center',
                            padding: '16px',
                            color: '#0f172a',
                            fontSize: '14px'
                          }}
                        >
                          {day}
                        </td>
                      )}
                      <td style={{ textAlign: 'center', padding: '16px', borderRight: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px' }}>
                          {item?.start_time ? `${item.start_time}-${item.end_time}` : slot.label}
                        </div>
                      </td>
                      <td style={{ backgroundColor: item ? bgColor : '#fff', padding: '14px 18px', borderLeft: item ? '4px solid #0284c7' : 'none' }}>
                        {item ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{subjectName}</span>
                                {item.class_id?.name && (
                                  <span style={{ fontSize: '11px', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                                    {item.class_id.name}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284c7' }}>person</span>
                                Guru: <strong>{teacherName}</strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(item)}
                              style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span> Detail & Aktivitas Sesi
                            </button>
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Tidak ada jadwal</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Detail Pertemuan Jadwal Siswa dengan Akses File Langsung */}
      {selectedScheduleModal && (
        <div className="modal-overlay" onClick={() => setSelectedScheduleModal(null)} style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px', background: '#ffffff', borderRadius: '24px', padding: '0', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '24px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', backdropFilter: 'blur(4px)' }}>
                  {selectedScheduleModal.day} • {selectedScheduleModal.start_time || '07:20'} - {selectedScheduleModal.end_time || '08:00'} WIB
                </span>
                <h3 style={{ margin: '8px 0 0 0', fontSize: '22px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
                  {selectedScheduleModal.subject_id?.name || 'Mata Pelajaran'}
                </h3>
              </div>
              <button onClick={() => setSelectedScheduleModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '20px', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Modal Body Scrollable */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              {/* Info Pengajar */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', display: 'block', textTransform: 'uppercase' }}>GURU PENGAJAR:</span>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>{selectedScheduleModal.teacher_id?.full_name || 'Guru Mata Pelajaran'}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>Kelas: {selectedScheduleModal.class_id?.name || '-'} • Ruangan: {selectedScheduleModal.room || 'Ruang Reguler KBM'}</span>
                </div>
              </div>

              {/* 1. SEKSI FILE MATERI PEMBELAJARAN LANGSUNG */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>folder</span> 📄 Materi Pembelajaran Sesi Ini
                </h4>
                {loadingModalData ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat berkas materi...</div>
                ) : modalMaterials.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {modalMaterials.map((mat, idx) => (
                      <div key={mat._id || idx} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{mat.title}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {mat.file_name || 'Dokumen Ajar'} • Diunggah {mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('id-ID') : 'Terbaru'}
                          </span>
                        </div>
                        {mat.file_url ? (
                          <a href={mat.file_url} target="_blank" rel="noreferrer" style={{ background: '#0284c7', color: '#ffffff', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Unduh / Buka
                          </a>
                        ) : (
                          <button onClick={() => window.location.href = '/dashboard/siswa/materials'} style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                            Buka Materi
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Belum ada file materi khusus yang diunggah untuk mapel ini.</p>
                    <button onClick={() => { setSelectedScheduleModal(null); window.location.href = '/dashboard/siswa/materials'; }} style={{ marginTop: '8px', background: '#0284c7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                      Buka Perpustakaan Materi
                    </button>
                  </div>
                )}
              </div>

              {/* 2. SEKSI TUGAS & ASESMEN LANGSUNG */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>assignment</span> 📝 Penugasan Kelas Sesi Ini
                </h4>
                {loadingModalData ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat penugasan...</div>
                ) : modalTasks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {modalTasks.map((t, idx) => (
                      <div key={t._id || idx} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{t.title}</strong>
                          <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '700' }}>
                            Tenggat: {t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Segera'}
                          </span>
                        </div>
                        <button onClick={() => { setSelectedScheduleModal(null); window.location.href = '/dashboard/siswa/assignments'; }} style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_document</span> Kerjakan
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Tidak ada tenggat tugas aktif untuk mapel ini saat ini.</p>
                  </div>
                )}
              </div>

              {/* 3. UJIAN CBT & QUIZ FAST LINK */}
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '14px 16px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '24px' }}>laptop_mac</span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#92400e', display: 'block' }}>Ruang Ujian CBT / Live Quiz</strong>
                    <span style={{ fontSize: '11px', color: '#b45309' }}>Cek jadwal ujian online & kuis interaktif kelas.</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedScheduleModal(null); window.location.href = '/dashboard/siswa/cbt'; }} style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                  Buka CBT
                </button>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedScheduleModal(null)}
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
              >
                Tutup Detail Sesi
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SiswaSchedule;
