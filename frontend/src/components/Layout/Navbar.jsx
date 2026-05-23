import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/components/navbarlanding.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar-modern">
      <div className="navbar-container-modern">
        {/* Logo / Brand */}
        <div className="navbar-brand-modern">
          <Link to="/" className="brand-link-modern" onClick={() => setIsMenuOpen(false)}>
            <img 
              src="/Logosmp.jpg"
              alt="Logo SMPN 1 Suradadi"
              className="brand-logo-modern"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
                }
              }}
            />
            <span className="brand-icon-modern" style={{ display: 'none' }}>🏫</span>
            <span className="brand-text-modern">SMP N 1 Suradadi</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className={`navbar-links-modern ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link-modern" onClick={() => setIsMenuOpen(false)}>Beranda</Link>
          <Link to="/tentang" className="nav-link-modern" onClick={() => setIsMenuOpen(false)}>Tentang</Link>
          <Link to="/kursus" className="nav-link-modern" onClick={() => setIsMenuOpen(false)}>Kursus</Link>
          <Link to="/kontak" className="nav-link-modern" onClick={() => setIsMenuOpen(false)}>Kontak</Link>
          
          {/*
          {user ? (
            <div className="nav-user-modern">
              <span className="user-name-modern">
                <span className="material-symbols-outlined">account_circle</span>
                {user.full_name || user.username}
              </span>
              <button onClick={handleLogout} className="btn-logout-modern">
                <span className="material-symbols-outlined">logout</span>
                Keluar
              </button>
            </div>
          ) : (
            <div className="nav-buttons-modern">
              <Link to="/login/siswa" className="nav-login-modern">
                <span className="material-symbols-outlined">login</span>
                Masuk
              </Link>
            </div>
          )}
            */}
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn-modern" onClick={toggleMenu}>
          <span className="bar-modern"></span>
          <span className="bar-modern"></span>
          <span className="bar-modern"></span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;