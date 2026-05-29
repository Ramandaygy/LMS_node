import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const LoginGuru = () => {
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
  
      const response =
        await authService.login(formData);
  
      console.log(
        'LOGIN RESPONSE:',
        response
      );
  
      const user = response.user;
  
      if (!user) {
        setError('User data not found');
        return;
      }
  
      if (user.role !== 'guru') {
        setError(
          'Akun ini bukan akun guru. Akses ditolak.'
        );
        setLoading(false);
        return;
      }
  
      console.log(
        'LOCAL USER:',
        localStorage.getItem('user')
      );
  
      console.log(
        'LOCAL TOKEN:',
        localStorage.getItem('token')
      );
  
      // Sama seperti LoginAdmin
      window.location.href =
        '/dashboard/guru';
  
    } catch (error) {
  
      console.error(error);
  
      setError(
        error.response?.data?.message ||
        'Login failed'
      );
  
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
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <h1>SMP N 1 SURADADI</h1>
          </div>
          <h2>Teaching <span>Excellence</span> Portal</h2>
          <p>Welcome to SMP N 1 ScholarFlow Educator Hub. Streamline your teaching workflow, manage classes, and inspire the next generation of leaders.</p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">class</span>
              <div>
                <h4>Class Management</h4>
                <p>Organize courses, track attendance, and manage student progress.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">assignment_turned_in</span>
              <div>
                <h4>Student Assessment</h4>
                <p>Create assignments, grade submissions, and provide feedback.</p>
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
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <h2>SMP N 1 Suradadi</h2>
            <p> Access Guru</p>
          </div>

          {/* Form Card */}
          <div className="auth-card-modern">
            {/* Tab Navigation */}
            <div className="auth-tabs">
              <button className="auth-tab active">LOGIN</button>
              <Link to="/register/guru" className="auth-tab">REGISTER</Link>
              
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}
              
              <div className="auth-input-group">
                <label>Teacher ID or Email Address</label>
                <div className="auth-input-wrapper">
                  <span className="material-symbols-outlined">person</span>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. teacher@gmail.com"
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

            {/* Register Link */}
            <div className="auth-register-prompt">
              <p>First time here? Register your educator account.</p>
              
            </div>
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

export default LoginGuru;