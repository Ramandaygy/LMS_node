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
  const [modalForums, setModalForums] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [newForumMessage, setNewForumMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedSession, setSelectedSession] = useState(1);

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

  const handleOpenScheduleModal = async (sch, sessionNum = 1) => {
    setSelectedScheduleModal(sch);
    setSelectedSession(sessionNum);
    setLoadingModalData(true);
    setModalMaterials([]);
    setModalTasks([]);
    setModalForums([]);
    setNewForumMessage('');
    try {
      const subjectId = sch.subject_id?._id || sch.subject_id;
      const classId = sch.class_id?._id || sch.class_id;

      const [mRes, tRes, fRes] = await Promise.allSettled([
        api.get('/materials'),
        api.get('/assignments/student/my-assignments'),
        api.get(`/forums/messages?subjectId=${subjectId}&sessionNumber=${sessionNum}`)
      ]);

      if (mRes.status === 'fulfilled') {
        const allMats = mRes.value.data.data || mRes.value.data.materials || [];
        setModalMaterials(allMats.filter(m => {
          const mSub = (m.subject_id?._id || m.subject_id || '').toString();
          const targetSub = (subjectId || '').toString();
          const mClass = (m.class_id?._id || m.class_id || '').toString();
          const targetClass = (classId || '').toString();
          const isSessionMatch = parseInt(m.session_number) === sessionNum;
          return (mSub === targetSub || (m.title && sch.subject_id?.name && m.title.toLowerCase().includes(sch.subject_id.name.toLowerCase()))) &&
                 (mClass === targetClass || m.class_name === sch.class_name) && isSessionMatch;
        }));
      }

      if (tRes.status === 'fulfilled') {
        const allTasks = tRes.value.data.assignments || tRes.value.data.data || [];
        setModalTasks(allTasks.filter(t => {
          const tSub = (t.subject_id?._id || t.subject_id || '').toString();
          const targetSub = (subjectId || '').toString();
          const isSessionMatch = parseInt(t.session_number) === sessionNum;
          return tSub === targetSub && isSessionMatch;
        }));
      }

      if (fRes.status === 'fulfilled') {
        const allForums = fRes.value.data.messages || fRes.value.data.data || [];
        setModalForums(allForums);
      }

    } catch (err) {
      console.error('Error loading modal session details:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleSendForumMessage = async () => {
    if (!newForumMessage.trim() || !selectedScheduleModal) return;
    
    setSendingMessage(true);
    try {
      const subjectId = selectedScheduleModal.subject_id?._id || selectedScheduleModal.subject_id;
      const classId = selectedScheduleModal.class_id?._id || selectedScheduleModal.class_id;
      
      const payload = {
        subjectId: subjectId,
        classId: classId,
        materialId: null,
        sessionNumber: selectedSession,
        content: newForumMessage.trim()
      };

      const res = await api.post('/forums/messages', payload);
      
      if (res.data && res.data.success) {
        setNewForumMessage('');
        const fRes = await api.get(`/forums/messages?subjectId=${subjectId}&sessionNumber=${selectedSession}`);
        if (fRes.data.success) {
          setModalForums(fRes.data.messages || fRes.data.data || []);
        }
      } else {
        throw new Error(res.data?.message || 'Gagal mengirim pesan');
      }

    } catch (err) {
      console.error('❌ Gagal kirim pesan:', err);
      alert(`❌ Gagal mengirim pesan: ${err.message}`);
    } finally {
      setSendingMessage(false);
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

      {selectedScheduleModal && (
        <div onClick={() => setSelectedScheduleModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', width: '90%', maxWidth: '960px', borderRadius: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ 
              padding: '20px 24px', 
              background: '#0f172a',
              color: '#ffffff', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backdropFilter: 'blur(4px)' }}>
                    {selectedScheduleModal.day} • {selectedScheduleModal.start_time || '07:20'} - {selectedScheduleModal.end_time || '08:00'}
                  </span>
                  {selectedScheduleModal.class_id?.name && (
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
                      📚 {selectedScheduleModal.class_id.name}
                    </span>
                  )}
                  {/* Sesi Dropdown */}
                  <select 
                    value={selectedSession} 
                    onChange={(e) => handleOpenScheduleModal(selectedScheduleModal, Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      borderRadius: '20px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {[...Array(16)].map((_, i) => (
                      <option key={i + 1} value={i + 1} style={{ color: '#0f172a' }}>Pertemuan Sesi ke-{i + 1}</option>
                    ))}
                  </select>
                </div>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '20px', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
                  {selectedScheduleModal.subject_id?.name || 'Mata Pelajaran'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedScheduleModal(null)} 
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: '20px', 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ×
              </button>
            </div>

            {/* Modal Body in Grid (2 columns) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              {/* Column 1: Sesi Detail, Materi, Tugas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Info Pengajar */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>person</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Guru Pengajar</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      {selectedScheduleModal.teacher_id?.full_name || 'Guru Mata Pelajaran'}
                    </div>
                  </div>
                </div>

                {/* Materi */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '20px' }}>folder</span>
                    Materi Pembelajaran Sesi ke-{selectedSession}
                  </h4>
                  {loadingModalData ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat materi...</div>
                  ) : modalMaterials.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {modalMaterials.map((mat, idx) => (
                        <div key={mat._id || idx} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mat.title}</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{mat.file_name || 'Dokumen Ajar'} • {mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('id-ID') : 'Terbaru'}</span>
                          </div>
                          {mat.file_url ? (
                            <a href={mat.file_url} target="_blank" rel="noreferrer" style={{ background: '#0284c7', color: '#fff', textDecoration: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span> Buka
                            </a>
                          ) : (
                            <button onClick={() => { setSelectedScheduleModal(null); window.location.href = '/dashboard/siswa/materials'; }} style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              Buka Materi
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Belum ada materi untuk pertemuan sesi ini.</p>
                    </div>
                  )}
                </div>

                {/* Tugas */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '20px' }}>assignment</span>
                    Penugasan Sesi ke-{selectedSession}
                  </h4>
                  {loadingModalData ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat tugas...</div>
                  ) : modalTasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {modalTasks.map((t, idx) => (
                        <div key={t._id || idx} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</strong>
                            <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: '600' }}>⏰ {t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Segera'}</span>
                          </div>
                          <button onClick={() => { setSelectedScheduleModal(null); window.location.href = '/dashboard/siswa/assignments'; }} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_document</span> Kerjakan
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Tidak ada tugas aktif untuk pertemuan sesi ini.</p>
                    </div>
                  )}
                  {/* 4. CBT */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '22px' }}>laptop_mac</span>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#92400e' }}>Ruang Ujian CBT / Quiz</strong>
                        <span style={{ fontSize: '11px', color: '#b45309', display: 'block' }}>Cek jadwal ujian online & kuis interaktif</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedScheduleModal(null); window.location.href = '/dashboard/siswa/cbt'; }} 
                      style={{ 
                        background: '#d97706', 
                        color: '#fff', 
                        border: 'none', 
                        padding: '6px 14px', 
                        borderRadius: '8px', 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        cursor: 'pointer' 
                      }}
                    >
                      Buka CBT
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 2: Forum Chat Room */}
              <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '24px' }}>💬</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      Forum Diskusi Sesi ke-{selectedSession}
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                      Ruang tanya jawab aktif kelas
                    </p>
                  </div>
                </div>

                {/* Daftar Diskusi */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', paddingRight: '4px', minHeight: '200px' }}>
                  {loadingModalData ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat diskusi...</div>
                  ) : modalForums.length > 0 ? (
                    modalForums.map((forum, idx) => (
                      <div
                        key={forum._id || idx}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: forum.isTeacher ? '#0284c7' : '#0f172a' }}>
                            {forum.user_name || forum.author?.full_name || 'Siswa'} {forum.isTeacher && '👨‍🏫'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {forum.created_at ? new Date(forum.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                          {forum.content || forum.message || 'Pesan'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff' }}>
                      Belum ada diskusi untuk sesi ini. Mulailah bertanya!
                    </div>
                  )}
                </div>

                {/* Form Kirim Pesan */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newForumMessage}
                    onChange={(e) => setNewForumMessage(e.target.value)}
                    placeholder="Tulis pertanyaan..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendForumMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendForumMessage}
                    disabled={!newForumMessage.trim() || sendingMessage}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: newForumMessage.trim() && !sendingMessage ? '#0284c7' : '#94a3b8',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: newForumMessage.trim() && !sendingMessage ? 'pointer' : 'default',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '12px 24px', 
              background: '#f8fafc', 
              borderTop: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'flex-end',
              flexShrink: 0
            }}>
              <button 
                onClick={() => setSelectedScheduleModal(null)}
                style={{ 
                  background: '#0f172a', 
                  color: '#ffffff', 
                  border: 'none', 
                  padding: '8px 20px', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0f172a'}
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