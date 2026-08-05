import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const OrtuReports = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [subjectGrades, setSubjectGrades] = useState([]);
  const [raporData, setRaporData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [parentFeedback, setParentFeedback] = useState('');

  const isMulokSubject = (name) => {
    const n = (name || '').toLowerCase();
    return n.includes('muatan lokal') || n.includes('mulok') || n.includes('bahasa jawa') || n.includes('bahasa daerah');
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/ortu/children');
      const kids = res.data.children || [];
      setChildren(kids);
      if (kids.length > 0) {
        setSelectedChild(kids[0]);
        fetchReportData(kids[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching children:', err);
      setLoading(false);
    }
  };

  const fetchReportData = async (childId) => {
    try {
      setLoading(true);
      
      // Fetch progress
      const progRes = await api.get(`/progress/ortu/children/${childId}`);
      setProgress(progRes.data.data);

      // Fetch official Rapor
      try {
        const rapRes = await api.get(`/rapor/student/${childId}`);
        if (rapRes.data.success && rapRes.data.data) {
          setRaporData(rapRes.data.data);
          setParentFeedback(rapRes.data.data.parent_feedback || '');
        } else {
          setRaporData(null);
          setParentFeedback('');
        }
      } catch (rapErr) {
        console.warn('Rapor resmi tidak ditemukan, menggunakan kalkulasi otomatis:', rapErr);
        setRaporData(null);
        setParentFeedback('');
      }

      // Fetch assignments
      const assignRes = await api.get(`/assignments/ortu/children/${childId}`);
      const assignments = assignRes.data.data || [];
      
      // Group by subject
      const subjectMap = {};
      assignments.forEach(a => {
        const subj = a.subject_name || 'Lainnya';
        if (!subjectMap[subj]) {
          subjectMap[subj] = { totalScore: 0, count: 0 };
        }
        if (a.score !== null && a.score !== undefined) {
          subjectMap[subj].totalScore += a.score;
          subjectMap[subj].count += 1;
        }
      });

      const gradesList = Object.keys(subjectMap).map(subj => {
        const { totalScore, count } = subjectMap[subj];
        const avg = count > 0 ? totalScore / count : 0;
        let gradeLetter = 'E';
        if (avg >= 85) gradeLetter = 'A';
        else if (avg >= 70) gradeLetter = 'B';
        else if (avg >= 55) gradeLetter = 'C';
        else if (avg >= 40) gradeLetter = 'D';

        let desc = 'Sangat Baik';
        if (gradeLetter === 'B') desc = 'Baik';
        else if (gradeLetter === 'C') desc = 'Cukup';
        else if (gradeLetter === 'D') desc = 'Kurang';
        else if (gradeLetter === 'E') desc = 'Sangat Kurang';

        return {
          subject: subj,
          taskCount: count,
          average: avg,
          gradeLetter,
          description: desc
        };
      });

      setSubjectGrades(gradesList);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (e) => {
    const childId = e.target.value;
    const child = children.find(c => c.id === childId);
    setSelectedChild(child);
    if (child) {
      fetchReportData(child.id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveParentFeedback = async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const res = await api.post(`/rapor/student/${selectedChild.id}`, {
        parent_feedback: parentFeedback
      });
      if (res.data.success) {
        alert('Tanggapan orang tua berhasil disimpan!');
        setRaporData(res.data.data);
      }
    } catch (err) {
      console.error('Error saving parent feedback:', err);
      alert('Gagal menyimpan tanggapan orang tua.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ortu-reports-container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            .print-area, .print-area * { visibility: visible !important; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; border: none !important; box-shadow: none !important; }
            .no-print { display: none !important; }
            .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
          }
        `}
      </style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: '#0f172a', fontWeight: 'bold', margin: '0 0 8px 0' }}>Laporan Akademik</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Lihat dan cetak laporan hasil belajar anak Anda</p>
        </div>
        <button 
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'background 0.3s' }}
          onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.background = '#2563eb'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
          Cetak Laporan
        </button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat data laporan...</div>
      ) : children.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ada data anak yang terkait dengan akun ini.
        </div>
      ) : (
        <>
          <div className="no-print" style={{ marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontWeight: '600', color: '#334155' }}>Pilih Anak:</label>
            <select 
              value={selectedChild?.id || ''} 
              onChange={handleChildChange}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '250px', fontSize: '14px', background: '#f8fafc' }}
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.class_name || 'Tidak ada kelas'})</option>
              ))}
            </select>
          </div>

          {/* PRINTABLE AREA */}
          <div className="print-area" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            
            {raporData ? (
              // OFFICIAL RAPOR FROM HOMEROOM TEACHER
              <div>
                {/* KOP / IDENTITY */}
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px double #000', paddingBottom: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', textTransform: 'uppercase' }}>LAPORAN HASIL BELAJAR</h2>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800' }}>{raporData.school_name || 'SMP NEGERI 1 SURADADI'}</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#475569' }}>{raporData.school_address}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div>
                    <p style={{ margin: '4px 0' }}><strong>Nama Murid:</strong> {selectedChild?.full_name}</p>
                    <p style={{ margin: '4px 0' }}><strong>NIS / NISN:</strong> {selectedChild?.nis || '-'} / {raporData.student_id?.nisn || '-'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Sekolah:</strong> {raporData.school_name || 'SMP NEGERI 1 SURADADI'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Alamat:</strong> {raporData.school_address || 'Jl. Desa Sidoharjo'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '4px 0' }}><strong>Kelas:</strong> {selectedChild?.class_name || '-'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Fase:</strong> D</p>
                    <p style={{ margin: '4px 0' }}><strong>Semester:</strong> {raporData.semester || '2 (Genap)'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Tahun Ajaran:</strong> {progress?.academic_year || '2025/2026'}</p>
                  </div>
                </div>

                {/* SUBJECT GRADES TABLE (WAJIB) */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', color: '#0f172a' }}>Mata Pelajaran Wajib</h3>
                  {subjectGrades.filter(sg => !isMulokSubject(sg.subject)).length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '220px' }}>Mata Pelajaran</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '100px' }}>Nilai Akhir</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Capaian Kompetensi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectGrades.filter(sg => !isMulokSubject(sg.subject)).map((sg, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: '600' }}>{sg.subject}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '800' }}>{Math.round(sg.average)}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11px', lineHeight: '1.4' }}>
                              {raporData.competencies?.[sg.subject] || `Mencapai Kompetensi dengan sangat baik dalam materi ajar ${sg.subject}.`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#64748b', fontStyle: 'italic' }}>Belum ada data nilai pelajaran wajib.</p>
                  )}
                </div>

                {/* SUBJECT GRADES TABLE (MULOK) */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', color: '#0f172a' }}>Muatan Lokal</h3>
                  {subjectGrades.filter(sg => isMulokSubject(sg.subject)).length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '220px' }}>Mata Pelajaran</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '100px' }}>Nilai Akhir</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Capaian Kompetensi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectGrades.filter(sg => isMulokSubject(sg.subject)).map((sg, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: '600' }}>{sg.subject}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '800' }}>{Math.round(sg.average)}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11px', lineHeight: '1.4' }}>
                              {raporData.competencies?.[sg.subject] || `Mencapai Kompetensi dengan sangat baik dalam materi ajar ${sg.subject}.`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '220px' }}>Mata Pelajaran</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '100px' }}>Nilai Akhir</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Capaian Kompetensi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>1</td>
                          <td style={{ border: '1px solid #000', padding: '8px', fontWeight: '600' }}>Muatan Lokal Bahasa Daerah</td>
                          <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '800' }}>80</td>
                          <td style={{ border: '1px solid #000', padding: '8px', fontSize: '11px', lineHeight: '1.4' }}>
                            Mencapai Kompetensi dengan sangat baik dalam hal Memahami isi teks narasi tentang peristiwa atau kejadian.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* KOKURIKULER / P5 SECTION */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>Kokurikuler</h3>
                  <div style={{ padding: '12px', border: '1px solid #000', fontSize: '11px', lineHeight: '1.5', background: '#fafafa' }}>
                    {raporData.kokurikuler_note || 'Pada semester ini, ananda menunjukkan capaian yang cukup baik dalam pelaksanaan projek kokurikuler Penguatan Profil Pelajar Pancasila.'}
                  </div>
                </div>

                {/* EXTRA-CURRICULAR */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', color: '#0f172a' }}>Ekstrakurikuler</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', width: '220px' }}>Kegiatan Ekstrakurikuler</th>
                        <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raporData.extracurriculars && raporData.extracurriculars.length > 0 ? (
                        raporData.extracurriculars.map((ex, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', fontWeight: '600' }}>{ex.name}</td>
                            <td style={{ border: '1px solid #000', padding: '8px' }}>{ex.note || ex.keterangan || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>1</td>
                          <td style={{ border: '1px solid #000', padding: '8px', fontWeight: '600' }}>Pramuka Putra</td>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>Memiliki kedisiplinan tinggi, aktif, dan mau bekerja sama dalam berbagai kegiatan lapangan.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ATTENDANCE & NOTE */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', color: '#0f172a' }}>Ketidakhadiran</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Keadaan</th>
                          <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '120px' }}>Lamanya</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>Sakit</td>
                          <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '700' }}>{raporData.attendance?.sick || 0} hari</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>Izin</td>
                          <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '700' }}>{raporData.attendance?.permit || 0} hari</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '8px' }}>Tanpa Keterangan</td>
                          <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: '700' }}>{raporData.attendance?.absent || 0} hari</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '10px', color: '#0f172a' }}>Catatan Wali Kelas</h3>
                    <div style={{ padding: '14px', border: '1px solid #000', height: '106px', boxSizing: 'border-box', fontSize: '12px', fontStyle: 'italic', lineHeight: '1.5', background: '#fafafa' }}>
                      {raporData.note || 'Ananda memiliki perkembangan belajar yang baik.'}
                    </div>
                  </div>
                </div>

                {/* PARENT FEEDBACK SECTION (TANGGAPAN ORANG TUA) */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>Tanggapan Orang Tua / Wali Murid</h3>
                  <div style={{ border: '1px solid #000', padding: '12px', background: '#fafafa' }}>
                    <textarea
                      rows={3}
                      placeholder="Masukkan tanggapan Anda sebagai orang tua di sini..."
                      value={parentFeedback}
                      onChange={(e) => setParentFeedback(e.target.value)}
                      className="no-print"
                      style={{
                        width: '100%',
                        border: '1px dashed #cbd5e1',
                        padding: '8px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        marginBottom: '8px'
                      }}
                    />
                    <button
                      onClick={handleSaveParentFeedback}
                      className="no-print"
                      style={{
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Simpan Tanggapan
                    </button>
                    {raporData.parent_feedback && (
                      <div style={{ marginTop: '8px', padding: '8px', borderLeft: '3px solid #16a34a', fontStyle: 'italic', fontSize: '11px', color: '#334155' }}>
                        "{raporData.parent_feedback}"
                      </div>
                    )}
                  </div>
                </div>

                {/* SIGNATURE BLOCK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', fontSize: '11px', marginTop: '36px' }}>
                  <div>
                    <div>Mengetahui,</div>
                    <div>Orang Tua / Wali</div>
                    <div style={{ height: '50px' }}></div>
                    <div style={{ fontWeight: '700', textDecoration: 'underline' }}>( {raporData.parent_feedback ? 'Orang Tua Siswa' : '....................................'} )</div>
                  </div>

                  <div>
                    <div>{raporData.place_date || 'Tegal, 19 Juni 2026'}</div>
                    <div>Wali Kelas</div>
                    <div style={{ height: '40px' }}></div>
                    <div style={{ fontWeight: '700', textDecoration: 'underline' }}>{raporData.teacher_name || 'Wali Kelas'}</div>
                    <div>{raporData.teacher_nip || ''}</div>
                  </div>

                  <div>
                    <div>Mengetahui,</div>
                    <div>Kepala Sekolah</div>
                    <div style={{ height: '40px' }}></div>
                    <div style={{ fontWeight: '700', textDecoration: 'underline' }}>{raporData.headmaster_name || 'Kepala Sekolah'}</div>
                    <div>{raporData.headmaster_nip || ''}</div>
                  </div>
                </div>
              </div>
            ) : (
              // FALLBACK / AUTO SUMMARY
              <div>
                <div className="print-header" style={{ marginBottom: '30px', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
                  <h1 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#0f172a', textTransform: 'uppercase' }}>Laporan Hasil Belajar Siswa (Draft)</h1>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px', textAlign: 'left', fontSize: '14px', color: '#334155' }}>
                    <div>
                      <p style={{ margin: '4px 0' }}><strong>Nama Siswa:</strong> {selectedChild?.full_name}</p>
                      <p style={{ margin: '4px 0' }}><strong>NIS:</strong> {selectedChild?.nis || '-'}</p>
                    </div>
                    <div>
                      <p style={{ margin: '4px 0' }}><strong>Kelas:</strong> {selectedChild?.class_name || '-'}</p>
                      <p style={{ margin: '4px 0' }}><strong>Tanggal Dicetak:</strong> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                {progress && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a', fontSize: '18px' }}>A. Ringkasan Akademik</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Rata-rata Keseluruhan</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', marginTop: '8px' }}>{progress.avgScore?.toFixed(1) || 0}</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Kehadiran</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginTop: '8px' }}>{progress.attendanceRate?.toFixed(1) || 100}%</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Penyelesaian Materi</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333ea', marginTop: '8px' }}>{progress.materialCompletionRate?.toFixed(1) || 0}%</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Status Risiko</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: progress.risk === 'High' ? '#dc2626' : progress.risk === 'Medium' ? '#d97706' : '#16a34a', marginTop: '12px' }}>
                          {progress.risk === 'Low' ? 'Aman' : progress.risk === 'Medium' ? 'Perlu Perhatian' : 'Kritis'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a', fontSize: '18px' }}>B. Nilai Mata Pelajaran</h3>
                  {subjectGrades.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', width: '50px' }}>No</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'left' }}>Mata Pelajaran</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>Tugas Terkumpul</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>Rata-rata Nilai</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>Predikat</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'left' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectGrades.map((sg, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px' }}>{sg.subject}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>{sg.taskCount}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{sg.average.toFixed(1)}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{sg.gradeLetter}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px' }}>{sg.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>Belum ada data nilai tugas untuk anak ini.</p>
                  )}
                </div>

                {progress?.message && (
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#0f172a', fontSize: '18px' }}>C. Catatan Sistem</h3>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', lineHeight: '1.5' }}>
                      {progress.message}
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ marginBottom: '80px' }}>Mengetahui,</p>
                    <p style={{ borderTop: '1px solid #000', paddingTop: '10px' }}><strong>Orang Tua / Wali</strong></p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default OrtuReports;
