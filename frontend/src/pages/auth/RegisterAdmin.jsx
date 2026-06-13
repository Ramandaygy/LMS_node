import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const RegisterAdmin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    secret_code: ''
  });
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

    if (formData.secret_code !== 'ADMIN123') {
      setError('Invalid secret code. Administrator registration is restricted.');
      setLoading(false);
      return;
    }

    const submitData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      phone: formData.phone,
      role: 'admin'
    };

    try {
      await authService.register(submitData);
      navigate('/login/admin');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-bg"></div>
        <div className="auth-left-overlay"></div>
        <div className="auth-left-content">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <h1>SMP N 1 SURADADI</h1>
          </div>
          <h2>Administrator <span>Registration</span></h2>
          <p>Authorized personnel only. Please enter your valid access code to register as an administrator.</p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">verified</span>
              <div>
                <h4>Secure Access</h4>
                <p>Authorized personnel with valid credentials only.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">analytics</span>
              <div>
                <h4>System Oversight</h4>
                <p>Complete control over academic data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-mobile-branding">
            <div className="auth-mobile-logo">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <h2>SMP N 1 SURADADI</h2>
            <p>Administrator Registration</p>
          </div>

          <div className="auth-card-modern">
            <div className="auth-tabs">
              <Link to="/login/admin" className="auth-tab">LOGIN</Link>
              <button className="auth-tab active">REGISTER</button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}
              
              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label>Full Name *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">badge</span>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Username *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">person</span>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label>Email Address *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@smpn1suradadi.sch.id"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Password *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
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
              </div>

              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label>Phone Number</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">call</span>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g., 081234567890"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Secret Code *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">key</span>
                    <input
                      type="password"
                      name="secret_code"
                      value={formData.secret_code}
                      onChange={handleChange}
                      placeholder="Enter administrator access code"
                      required
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? 'Processing...' : 'Register as Admin'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className="auth-register-prompt">
              <p>Already have an account?</p>
              <Link to="/login/admin" className="auth-register-btn">
                <span className="material-symbols-outlined">login</span>
                Sign In to Dashboard
              </Link>
            </div>
          </div>

          <div className="auth-footer-info">
            <div className="auth-footer-support">
              <span className="material-symbols-outlined">support_agent</span>
              <span>Technical Support</span>
            </div>
            <span>SMP N 1 SURADADI v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterAdmin;