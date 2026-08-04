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
    setModalForums([]);
    setNewForumMessage('');
    try {
      const subjectId = sch.subject_id?._id || sch.subject_id;

      const [mRes, tRes, fRes] = await Promise.allSettled([
        api.get('/materials'),
        api.get('/assignments/student/my-assignments'),
        api.get(`/forums/messages?subjectId=${subjectId}`) // <-- PAKAI subjectId (camelCase)
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

      if (fRes.status === 'fulfilled') {
        // Data dari controller menggunakan field 'messages'
        const allForums = fRes.value.data.messages || fRes.value.data.data || [];
        setModalForums(allForums);
      }

    } catch (err) {
      console.error('Error loading modal session details:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  // ============================================================
  // HANDLE SEND FORUM MESSAGE - SESUAI CONTROLLER
  // ============================================================
  const handleSendForumMessage = async () => {
    if (!newForumMessage.trim() || !selectedScheduleModal) return;
    
    setSendingMessage(true);
    try {
      const subjectId = selectedScheduleModal.subject_id?._id || selectedScheduleModal.subject_id;
      const classId = selectedScheduleModal.class_id?._id || selectedScheduleModal.class_id;
      
      // PAYLOAD SESUAI CONTROLLER
      const payload = {
        subjectId: subjectId,                    // camelCase
        classId: classId,                        // camelCase
        materialId: null,                        // opsional
        sessionNumber: null,                     // opsional
        content: newForumMessage.trim()          // pakai content, bukan message!
      };

      console.log('📤 Mengirim pesan ke /forums/messages');
      console.log('Payload:', payload);

      const res = await api.post('/forums/messages', payload);
      
      console.log('✅ Response:', res.data);

      if (res.data && res.data.success) {
        setNewForumMessage('');
        // Refresh daftar pesan
        const fRes = await api.get(`/forums/messages?subjectId=${subjectId}`);
        if (fRes.data.success) {
          setModalForums(fRes.data.messages || []);
        }
        alert('✅ Pesan berhasil dikirim!');
      } else {
        throw new Error(res.data?.message || 'Gagal mengirim pesan');
      }

    } catch (err) {
      console.error('❌ Gagal kirim pesan:', err);
      console.error('Response error:', err.response?.data);
      alert(`❌ Gagal mengirim pesan: ${err.response?.data?.message || err.message || 'Silakan coba lagi'}`);
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

      {/* MODAL */}
      {selectedScheduleModal && (
        <div className="modal-overlay" onClick={() => setSelectedScheduleModal(null)} style={{ 
          background: 'rgba(15, 23, 42, 0.65)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
            width: '100%', 
            maxWidth: '700px', 
            background: '#ffffff', 
            borderRadius: '24px', 
            padding: '0', 
            overflow: 'hidden', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            
            {/* Modal Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
              padding: '20px 24px', 
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

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              
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

              {/* 1. MATERI */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '20px' }}>folder</span>
                  Materi Pembelajaran Sesi Ini
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
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Belum ada materi untuk mapel ini.</p>
                  </div>
                )}
              </div>

              {/* 2. TUGAS */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '20px' }}>assignment</span>
                  Penugasan Kelas Sesi Ini
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
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Tidak ada tugas aktif untuk mapel ini.</p>
                  </div>
                )}
              </div>

              {/* 3. FORUM DISKUSI */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '22px' }}>💬</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      Forum Diskusi & Tanya Jawab
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Kirim pertanyaan atau diskusikan materi pelajaran
                    </p>
                  </div>
                </div>

                {/* Form Kirim Pesan */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={newForumMessage}
                    onChange={(e) => setNewForumMessage(e.target.value)}
                    placeholder="Tulis pertanyaan atau pesan diskusi..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#ffffff',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0284c7'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
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
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      background: newForumMessage.trim() && !sendingMessage ? '#0284c7' : '#94a3b8',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: newForumMessage.trim() && !sendingMessage ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                    {sendingMessage ? 'Mengirim...' : 'Kirim'}
                  </button>
                </div>

                {/* Daftar Diskusi */}
                {loadingModalData ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Memuat diskusi...</div>
                ) : modalForums.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {modalForums.slice(0, 5).map((forum, idx) => (
                      <div
                        key={forum._id || idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                            {forum.user_name || forum.author?.full_name || 'Siswa'}:
                          </strong>
                          <span style={{ fontSize: '13px', color: '#475569', marginLeft: '4px' }}>
                            {forum.content || forum.message || 'Pesan'}
                          </span>
                          {forum.isTeacher && (
                            <span style={{ 
                              background: '#dbeafe', 
                              color: '#2563eb', 
                              fontSize: '10px', 
                              padding: '1px 8px', 
                              borderRadius: '10px',
                              marginLeft: '6px',
                              fontWeight: '600'
                            }}>
                              Guru
                            </span>
                          )}
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {forum.created_at ? new Date(forum.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                    {modalForums.length > 5 && (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                        +{modalForums.length - 5} pesan lainnya
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '2px dashed #cbd5e1'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '4px' }}>💭</div>
                    <h5 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0f172a' }}>Belum Ada Diskusi</h5>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Kirim pertanyaan pertama di kolom di atas</p>
                  </div>
                )}
              </div>

              {/* 4. CBT */}
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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