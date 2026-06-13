import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const RegisterGuru = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    nip: '',
    subject: '',
    phone: ''
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

    const submitData = {
      ...formData,
      role: 'guru'
    };

    try {
      await authService.register(submitData);
      navigate('/login/guru');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
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
          <h2>Join Our <span>Teaching</span> Community</h2>
          <p>Register as an educator at SMP N 1 Suradadi. Access powerful teaching tools, manage your classes, and inspire the next generation.</p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">class</span>
              <div>
                <h4>Class Management</h4>
                <p>Organize courses and track student progress.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">assignment_turned_in</span>
              <div>
                <h4>Assessment Tools</h4>
                <p>Create assignments and grade submissions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-mobile-branding">
            <div className="auth-mobile-logo">
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <h2>SMP N 1 SURADADI</h2>
            <p>Educator Registration</p>
          </div>

          <div className="auth-card-modern">
            <div className="auth-tabs">
              <Link to="/login/guru" className="auth-tab">LOGIN</Link>
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
                      placeholder="teacher@email.com"
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
                  <label>NIP (Teacher ID) *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">numbers</span>
                    <input
                      type="text"
                      name="nip"
                      value={formData.nip}
                      onChange={handleChange}
                      placeholder="Enter your NIP"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Subject *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">menu_book</span>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="e.g., Mathematics, Science"
                      required
                    />
                  </div>
                </div>
              </div>

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

              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? 'Processing...' : 'Create Account'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className="auth-register-prompt">
              <p>Already have an account?</p>
              <Link to="/login/guru" className="auth-register-btn">
                <span className="material-symbols-outlined">login</span>
                Sign In to Your Account
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

export default RegisterGuru;