import api from './api';

export const profileService = {
  // Get current user profile
  async getProfile() {
    const response = await api.get('/profile');
    return response.data;
  },

  // Update user profile
  async updateProfile(data) {
    const response = await api.put('/profile', data);
    return response.data;
  },

  // Change password
  async changePassword(oldPassword, newPassword) {
    const response = await api.post('/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
    return response.data;
  },

  // Upload avatar
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Logout
  async logout() {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
};