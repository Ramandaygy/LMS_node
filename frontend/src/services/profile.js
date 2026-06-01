import api from './api';

export const profileService = {
  async getProfile() {
    const response = await api.get('/profile');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/profile', data);
    return response.data;
  },

  async changePassword(oldPassword, newPassword) {
    // Perbaiki: tambahkan '/profile'
    const response = await api.post('/profile/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
    return response.data;
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async logout() {
    try {
      // Perbaiki: tambahkan '/profile'
      await api.post('/profile/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
};