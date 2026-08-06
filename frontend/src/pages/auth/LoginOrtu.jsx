import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const LoginOrtu = () => {
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

      if (user.role !== 'ortu') {
        setError('Akun ini bukan akun orang tua. Silakan login di halaman yang sesuai.');
        setLoading(false);
        return;
      }

      navigate('/dashboard/ortu', { replace: true });

    } catch (error) {
      console.error('Login error:', error);
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
              <span className="material-symbols-outlined">family_restroom</span>
            </div>
            <h1>SMP N 1 SURADADI</h1>
          </div>
          <h2>Parent <span>Dashboard</span></h2>
          <p>Welcome to SMP N 1 Suradadi .</p>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">monitoring</span>
              <div>
                <h4>Child Progress Tracking</h4>
                <p>Monitor academic performance and learning progress in real-time.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">receipt</span>
              <div>
                <h4>Academic Reports</h4>
                <p>Access detailed report cards and teacher feedback.</p>
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
              <span className="material-symbols-outlined">family_restroom</span>
            </div>
            <h2>SMP N 1 SURADADI</h2>
            <p>Parent Access</p>
          </div>

          {/* Form Card */}
          <div className="auth-card-modern">
            <div className="auth-header-modern" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>LOGIN ORANG TUA</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Portal Pemantauan Orang Tua SMPN 1 Suradadi</p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}

              <div className="auth-input-group">
                <label>Email </label>
                <div className="auth-input-wrapper">
                  <span className="material-symbols-outlined">person</span>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. parent@email.com"
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
                {loading ? 'Processing...' : 'Login'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>
          </div>

          {/* Footer Info */}
          <div className="auth-footer-info">
            <div className="auth-footer-support">
              <span className="material-symbols-outlined">support_agent</span>
            </div>
            <span>SMP N 1 SURADADI v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginOrtu;