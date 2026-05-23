import api from './api';

export const adminService = {
  // ========== KELAS ==========
  async getClasses(params = {}) {
    const response = await api.get('/admin/classes', { params });
    return response.data;
  },
  
  async createClass(data) {
    const response = await api.post('/admin/classes', data);
    return response.data;
  },
  
  async updateClass(id, data) {
    const response = await api.put(`/admin/classes/${id}`, data);
    return response.data;
  },
  
  async deleteClass(id) {
    const response = await api.delete(`/admin/classes/${id}`);
    return response.data;
  },
  
  async getClassOptions() {
    const response = await api.get('/admin/classes/options');
    return response.data;
  },

  // FITUR EXPORT & IMPORT KELAS
  async exportClasses() {
    const response = await api.get('/admin/export/classes', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async importClasses(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/classes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ========== MATA PELAJARAN ==========
  async getSubjects(params = {}) {
    const response = await api.get('/admin/subjects', { params });
    return response.data;
  },
  
  async createSubject(data) {
    const response = await api.post('/admin/subjects', data);
    return response.data;
  },
  
  async updateSubject(id, data) {
    const response = await api.put(`/admin/subjects/${id}`, data);
    return response.data;
  },
  
  async deleteSubject(id) {
    const response = await api.delete(`/admin/subjects/${id}`);
    return response.data;
  },
  
  async getSubjectOptions() {
    const response = await api.get('/admin/subjects/options');
    return response.data;
  },

  async exportSubjects() {
    const response = await api.get('/admin/export/subjects', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async importSubjects(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/subjects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ========== TAHUN AJARAN ==========
  async getAcademicYears(params = {}) {
    const response = await api.get('/admin/academic-years', { params });
    return response.data;
  },
  
  async createAcademicYear(data) {
    const response = await api.post('/admin/academic-years', data);
    return response.data;
  },
  
  async updateAcademicYear(id, data) {
    const response = await api.put(`/admin/academic-years/${id}`, data);
    return response.data;
  },
  
  async deleteAcademicYear(id) {
    const response = await api.delete(`/admin/academic-years/${id}`);
    return response.data;
  },
  
  async getCurrentAcademicYear() {
    const response = await api.get('/admin/academic-years/current');
    return response.data;
  },

  async exportAcademicYears() {
    const response = await api.get('/admin/export/academic-years', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async importAcademicYears(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/academic-years', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ========== ASSIGN GURU ==========
  async getSchedule(params = {}) {
    const response = await api.get('/admin/schedule', { params });
    return response.data;
  },
  
  async createSchedule(data) {
    const response = await api.post('/admin/schedule', data);
    return response.data;
  },
  
  async deleteSchedule(id) {
    const response = await api.delete(`/admin/schedule/${id}`);
    return response.data;
  },
  
  async getAvailableTeachers() {
    const response = await api.get('/admin/schedule/teachers');
    return response.data;
  },

  // ========== SISWA ==========
  async getStudents(params = {}) {
    const response = await api.get('/admin/students', { params });
    return response.data;
  },
  
  async createStudent(data) {
    const response = await api.post('/admin/students', data);
    return response.data;
  },
  
  async updateStudent(id, data) {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data;
  },
  
  async deleteStudent(id) {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },
  
  async exportStudents() {
    const response = await api.get('/admin/export/students', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async importStudents(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ========== GURU ==========
  async getTeachers(params = {}) {
    const response = await api.get('/admin/teachers', { params });
    return response.data;
  },
  
  async createTeacher(data) {
    const response = await api.post('/admin/teachers', data);
    return response.data;
  },
  
  async updateTeacher(id, data) {
    const response = await api.put(`/admin/teachers/${id}`, data);
    return response.data;
  },
  
  async deleteTeacher(id) {
    const response = await api.delete(`/admin/teachers/${id}`);
    return response.data;
  },

  async exportTeachers() {
    const response = await api.get('/admin/export/teachers', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async importTeachers(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/teachers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ========== ORANG TUA ==========
  async getParents(params = {}) {
    const response = await api.get('/admin/parents', { params });
    return response.data;
  },
  
  async createParent(data) {
    const response = await api.post('/admin/parents', data);
    return response.data;
  },
  
  async updateParent(id, data) {
    const response = await api.put(`/admin/parents/${id}`, data);
    return response.data;
  },
  
  async deleteParent(id) {
    const response = await api.delete(`/admin/parents/${id}`);
    return response.data;
  },

  async exportParents() {
    const response = await api.get('/admin/export/parents', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  async importParents(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/import/parents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ========== TAMBAHAN UNTUK KENAIKAN KELAS & ALUMNI ==========
  /**
   * Mendapatkan daftar siswa berdasarkan kelas untuk keperluan promosi (kenaikan kelas)
   * @param {string} yearId - ID tahun ajaran tujuan
   * @param {string} className - Nama kelas asal (contoh: '7A')
   */
  async getStudentsByClassForPromotion(yearId, className) {
    const response = await api.get(`/admin/academic-years/${yearId}/students-by-class`, {
      params: { class: className }
    });
    return response.data;
  },

  /**
   * Melakukan kenaikan kelas massal
   * @param {string} yearId - ID tahun ajaran tujuan
   * @param {Object} data - { promotions: [{ student_id, new_class }], note: '...' }
   */
  async promoteStudents(yearId, data) {
    const response = await api.post(`/admin/academic-years/${yearId}/promote`, data);
    return response.data;
  },

  /**
   * Mendapatkan daftar alumni berdasarkan tahun ajaran kelulusan
   * @param {string} yearId - ID tahun ajaran
   */
  async getAlumniByYear(yearId) {
    const response = await api.get(`/admin/academic-years/${yearId}/alumni`);
    return response.data;
  },

  /**
   * Meluluskan siswa (memindahkan ke alumni)
   * @param {string} studentId - ID siswa
   * @param {string} graduationYearId - ID tahun ajaran kelulusan
   */
  async graduateStudent(studentId, graduationYearId) {
    const response = await api.post(`/admin/users/students/${studentId}/graduate`, {
      graduation_year_id: graduationYearId
    });
    return response.data;
  }
};