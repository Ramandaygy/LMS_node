import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Hero Section - Modern with Gradient */}
      <div className="hero-section-modern">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <div className="hero-text">
            <span className="hero-badge">Unggul & Berkarakter</span>
            <h1 className="hero-title-modern">
              Membentuk Masa Depan di <span className="highlight">SMP N 1 Suradadi</span>
            </h1>
            <p className="hero-subtitle-modern">
              Selamat datang di pusat kurasi akademik terbaik. Kami mengintegrasikan teknologi modern dengan nilai-nilai luhur untuk menciptakan pemimpin masa depan.
            </p>
            <div className="hero-buttons-modern">
              <Link to="/register/siswa" className="btn-primary-modern">
                Daftar Sekarang
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link to="/tentang" className="btn-secondary-modern">
                Profil Sekolah
              </Link>
            </div>
          </div>
          
          {/* Portal Login Bento */}
          <div className="portal-card">
            <h2 className="portal-title">
              <span className="material-symbols-outlined">login</span>
              Portal Akademik
            </h2>
            <div className="portal-grid">
              <Link to="/login/siswa" className="portal-item">
                <div className="portal-icon admin">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <div className="portal-info">
                  <div className="portal-label">Login Siswa</div>
                  <div className="portal-desc">Manajemen Siswa</div>
                </div>
                <span className="portal-arrow material-symbols-outlined">chevron_right</span>
              </Link>
              <Link to="/login/guru" className="portal-item">
                <div className="portal-icon guru">
                  <span className="material-symbols-outlined">school</span>
                </div>
                <div className="portal-info">
                  <div className="portal-label">Login Guru</div>
                  <div className="portal-desc">Portal Pengajaran & Nilai</div>
                </div>
                <span className="portal-arrow material-symbols-outlined">chevron_right</span>
              </Link>
              <Link to="/login/siswa" className="portal-item">
                <div className="portal-icon siswa">
                  <span className="material-symbols-outlined">family_restroom</span>
                </div>
                <div className="portal-info">
                  <div className="portal-label">Login Wali Murid</div>
                  <div className="portal-desc">Laporan Belajar & Informasi</div>
                </div>
                <span className="portal-arrow material-symbols-outlined">chevron_right</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Keunggulan Sekolah */}
      <div className="features-section">
        <div className="container">
          <div className="features-header">
            <div className="features-left">
              <span className="section-badge">Why Choose Us</span>
              <h2 className="section-title-modern">Kurasi Akademik yang Menunjang Potensi Maksimal</h2>
            </div>
            <p className="features-desc">
              Kami tidak hanya mengajar, kami membimbing siswa untuk menemukan minat bakat mereka melalui fasilitas modern.
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card feature-card-1">
              <div className="feature-icon">🔬</div>
              <h3>Laboratorium Modern</h3>
              <p>Fasilitas lab sains dan komputer dengan standar internasional untuk riset siswa.</p>
            </div>
            <div className="feature-card feature-card-2">
              <div className="feature-overlay"></div>
              <h3>Perpustakaan Digital</h3>
              <p>Akses ke ribuan jurnal dan buku digital dari seluruh dunia hanya dalam satu genggaman.</p>
            </div>
            <div className="feature-card feature-card-3">
              <div className="feature-overlay"></div>
              <h3>Pusat Olahraga</h3>
              <p>Menjaga keseimbangan antara kecerdasan kognitif dan ketangkasan fisik.</p>
            </div>
            <div className="feature-card feature-card-4">
              <div className="feature-icon">🧠</div>
              <h3>Kurikulum Adaptif</h3>
              <p>Metode pembelajaran yang disesuaikan dengan kecepatan belajar unik setiap individu.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Berita Terbaru */}
      <div className="news-section">
        <div className="container">
          <div className="news-header">
            <h2 className="section-title-modern">Berita Terbaru</h2>
            <Link to="/kursus" className="news-link">
              Lihat Semua Berita
              <span className="material-symbols-outlined">east</span>
            </Link>
          </div>
          
          <div className="news-grid">
            <div className="news-card">
              <div className="news-image"></div>
              <div className="news-content">
                <div className="news-date">📅 12 Okt 2024</div>
                <h3>Siswa SMP N 1 Meraih Medali Emas di Olimpiade Sains Nasional</h3>
                <p>Prestasi gemilang kembali ditorehkan oleh siswa kelas 9 dalam ajang tahunan paling bergengsi...</p>
              </div>
            </div>
            <div className="news-card">
              <div className="news-image"></div>
              <div className="news-content">
                <div className="news-date">📅 08 Okt 2024</div>
                <h3>Implementasi ScholarFlow: Era Baru Digitalisasi Sekolah</h3>
                <p>Digitalisasi sistem administrasi dan pembelajaran kini semakin mudah dengan platform ScholarFlow...</p>
              </div>
            </div>
            <div className="news-card">
              <div className="news-image"></div>
              <div className="news-content">
                <div className="news-date">📅 05 Okt 2024</div>
                <h3>Program Pengabdian Masyarakat: Siswa Peduli Lingkungan</h3>
                <p>Menanamkan rasa tanggung jawab sosial melalui kegiatan rutin kebersihan lingkungan sekitar...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="container cta-container">
          <div className="cta-content">
            <h2>Siap Memulai Langkah Pertama Anda?</h2>
            <p>Daftarkan diri Anda sekarang atau hubungi tim konselor akademik kami untuk informasi lebih lanjut mengenai kurikulum dan pendaftaran.</p>
            <div className="cta-buttons">
              <Link to="/kontak" className="cta-btn-primary">Hubungi Kami</Link>
              <Link to="/tentang" className="cta-btn-secondary">Jadwal Open House</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Diperbaiki */}
      <footer className="footer-modern">
        <div className="container footer-container">
          <div className="footer-brand">
            <div className="footer-logo">SMP N 1 Suradadi</div>
            <p>© 2025 SMP N 1 Suradadi. All rights reserved.</p>
          </div>
          <div className="footer-links">
            <Link to="/tentang">Tentang Kami</Link>
            <Link to="/kontak">Hubungi Kami</Link>
            <Link to="/kursus">Kursus</Link>
            <Link to="/login/siswa">Login Siswa</Link>
          </div>
          <div className="footer-contact">
            <p>📞 (021) 12345678</p>
            <p>✉️ info@smpn1suradadi.sch.id</p>
            <p>📍 Jl. Raya Suradadi No. 123, Tegal</p>
          </div>
          <div className="footer-social">
            <a href="#" className="social-btn">📘</a>
            <a href="#" className="social-btn">📷</a>
            <a href="#" className="social-btn">▶️</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Dikembangkan oleh Tim IT SMP N 1 Suradadi</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;