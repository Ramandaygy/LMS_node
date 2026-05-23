import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const LoginSiswa = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);
      const user = response.user;
      
      if (user.role !== 'siswa') {
        setError('Akun ini bukan akun siswa. Silakan login di halaman yang sesuai.');
        setLoading(false);
        return;
      }
      
      navigate('/dashboard/siswa');
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Side - Welcome Message */}
      <div className="auth-left">
        <div className="auth-left-bg"></div>
        <div className="auth-left-overlay"></div>
        <div className="auth-left-content">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h1>ScholarFlow</h1>
          </div>
          <h2>A Legacy of <span>Excellence</span>, Digitalized.</h2>
          <p>Welcome to SMP N 1 ScholarFlow. Whether you're a student embarking on a journey of discovery or a parent supporting their path, our curated learning environment is designed for your success.</p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">verified</span>
              <div>
                <h4>Curated Learning Paths</h4>
                <p>High-end editorial content tailored for the academic curriculum.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">monitoring</span>
              <div>
                <h4>Real-time Progress</h4>
                <p>Transparent analytics for parents and students alike.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Mobile Branding */}
          <div className="auth-mobile-branding">
            <div className="auth-mobile-logo">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h2>ScholarFlow</h2>
            <p>Access your learning portal</p>
          </div>

          {/* Form Card */}
          <div className="auth-card-modern">
            {/* Tab Navigation */}
            <div className="auth-tabs">
              <button className="auth-tab active">LOGIN</button>
              <Link to="/register/siswa" className="auth-tab">REGISTER</Link>
              <button className="auth-tab">ACTIVATE</button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}
              
              <div className="auth-input-group">
                <label>Student ID or Email Address</label>
                <div className="auth-input-wrapper">
                  <span className="material-symbols-outlined">person</span>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. 2024-SMPN1-001"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <div className="auth-label-row">
                  <label>Password</label>
                  <Link to="/forgot-password" className="auth-forgot">Forgot?</Link>
                </div>
                <div className="auth-input-wrapper">
                  <span className="material-symbols-outlined">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="auth-checkbox">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember this device for 30 days</label>
              </div>

              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? 'Processing...' : 'Access Dashboard'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            {/* Register Link */}
            <div className="auth-register-prompt">
              <p>First time here? Link your official student account.</p>
              <Link to="/register/siswa" className="auth-register-btn">
                <span className="material-symbols-outlined">app_registration</span>
                Account Activation
              </Link>
            </div>
          </div>

          {/* Footer Info */}
          <div className="auth-footer-info">
            <div className="auth-footer-support">
              <span className="material-symbols-outlined">support_agent</span>
              <span>Technical Support</span>
            </div>
            <span>SMP N 1 ScholarFlow v4.2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSiswa;