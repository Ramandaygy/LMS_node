import React from 'react';

const SuperAdminRoles = () => {
  const roles = [
    {
      role: 'Super Admin',
      key: 'super_admin',
      description: 'Pengelola utama sistem dengan akses penuh ke administrasi, log aktivitas, cadangan basis data, dan pembuatan akun.',
      permissions: ['Akses Penuh Dashboard', 'Provisikan / Manajemen Akun', 'Pengaturan Kop Surat Sekolah', 'Database Backup & Restore', 'Lihat Audit Activity Log']
    },
    {
      role: 'Admin TU (Tata Usaha)',
      key: 'admin',
      description: 'Pengelola administrasi data master siswa, guru, orang tua, dan konfigurasi kop surat dinamis sekolah.',
      permissions: ['Kelola Data Siswa', 'Kelola Data Guru', 'Kelola Data Orang Tua', 'Update Kop Surat Sekolah', 'Ekspor / Impor Data Master via Excel']
    },
    {
      role: 'Waka Kurikulum',
      key: 'wakil_kurikulum',
      description: 'Wakil Kepala Sekolah Bidang Kurikulum yang bertanggung jawab atas proses belajar mengajar (KBM).',
      permissions: ['Atur Tahun Ajaran & Kenaikan Kelas', 'Penjadwalan Guru Mengajar', 'Lihat Laporan Leger Nilai & Performa', 'Akses Menu KBM (Modul, Tugas, Absensi)']
    },
    {
      role: 'Guru BK (Bimbingan Konseling)',
      key: 'bk',
      description: 'Guru yang bertugas memantau rekap absensi harian rapor dan mendeteksi risiko akademis siswa.',
      permissions: ['Input Absensi Harian Rapor', 'Lihat EWS Risk Monitoring Siswa', 'Lihat Leger Nilai Sekolah']
    },
    {
      role: 'Guru Mapel',
      key: 'guru',
      description: 'Tenaga pendidik yang mengajar mata pelajaran spesifik dan mengelola nilai siswa.',
      permissions: ['Membuat Modul & Bank Materi', 'Membuat & Menilai Tugas Kelas', 'Mengelola Absensi KBM', 'Melakukan Live Quiz', 'Input Nilai Rapor']
    },
    {
      role: 'Siswa',
      key: 'siswa',
      description: 'Pengguna utama yang mengikuti KBM di kelas.',
      permissions: ['Membaca Modul Belajar', 'Mengumpulkan Tugas Kelas', 'Mengerjakan Simulasi CBT', 'Mengikuti Live Quiz', 'Lihat Presensi & Nilai Progress']
    },
    {
      role: 'Orang Tua / Wali',
      key: 'ortu',
      description: 'Wali murid yang memantau perkembangan belajar siswa.',
      permissions: ['Pantau Kehadiran Anak', 'Pantau Tugas & Nilai Anak', 'Mendapatkan Notifikasi / Alert AI Perkembangan Anak']
    }
  ];

  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
          SUPER ADMINISTRATOR
        </span>
        <h2 style={{ fontSize: '26px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
          Hak Akses & Manajemen Role
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
          Deskripsi cakupan kerja dan izin operasional untuk masing-masing hak akses di dalam sistem.
        </p>
      </div>

      {/* Role Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {roles.map((r, idx) => (
          <div key={r.key} style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{r.role}</h4>
              <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800' }}>
                AKTIF
              </span>
            </div>
            
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6, minHeight: '60px' }}>
              {r.description}
            </p>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                Izin Operasional:
              </div>
              <ul style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {r.permissions.map((perm, pIdx) => (
                  <li key={pIdx} style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminRoles;
