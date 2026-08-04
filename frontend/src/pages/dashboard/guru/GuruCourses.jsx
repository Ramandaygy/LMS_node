import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-modul.css';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

const getCurrentDayName = () => {
  const dayIdx = new Date().getDay();
  const dayMap = { 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' };
  return dayMap[dayIdx] || 'SENIN';
};

const formatTime = (time) => {
  if (!time) return '08:00';
  return time.replace('.', ':');
};

const getMinutesDiff = (start, end) => {
  if (!start || !end) return 0;
  const cleanStart = formatTime(start);
  const cleanEnd = formatTime(end);
  const [startH, startM] = cleanStart.split(':').map(Number);
  const [endH, endM] = cleanEnd.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  return (endH * 60 + endM) - (startH * 60 + startM);
};

const calculateJP = (start, end) => {
  const duration = getMinutesDiff(start, end);
  return Math.max(1, Math.round(duration / 40));
};

const getMeetingDate = (day, sessionIdx) => {
  const dayMap = { 
    'SENIN': 1, 'SELASA': 2, 'RABU': 3, 
    'KAMIS': 4, 'JUMAT': 5, 'SABTU': 6 
  };
  
  const now = new Date();
  const currentDay = now.getDay();
  const targetDay = dayMap[day] || 1;
  
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  
  const firstMeeting = new Date(now);
  firstMeeting.setDate(now.getDate() + diff);
  
  const meetingDate = new Date(firstMeeting);
  meetingDate.setDate(firstMeeting.getDate() + (sessionIdx * 7));
  
  return meetingDate;
};

const GuruCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [allDbSchedules, setAllDbSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());

  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [activeCourseDetail, setActiveCourseDetail] = useState(null);
  
  // BANK MATERIAL - Checklist (multiple select)
  const [bankMaterialModal, setBankMaterialModal] = useState(null);
  const [bankMaterials, setBankMaterials] = useState([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [loadingBankMaterials, setLoadingBankMaterials] = useState(false);
  const [publishingMaterial, setPublishingMaterial] = useState(false);

  // TASK - Checklist (multiple select)
  const [taskModal, setTaskModal] = useState(null);
  const [teacherTasks, setTeacherTasks] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [sessionMaterials, setSessionMaterials] = useState([]);
  const [sessionAssignments, setSessionAssignments] = useState([]);
  const [loadingSessionData, setLoadingSessionData] = useState(false);

  const [classStudents, setClassStudents] = useState([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  const [allClassTasks, setAllClassTasks] = useState([]);
  const [loadingAllClassTasks, setLoadingAllClassTasks] = useState(false);
  const [classGrades, setClassGrades] = useState([]);
  const [loadingClassGrades, setLoadingClassGrades] = useState(false);

  const [sessionPlans, setSessionPlans] = useState({});
  const [editingPlanModal, setEditingPlanModal] = useState(null);
  const [planForm, setPlanForm] = useState({ rencana: '', realisasi: '' });

  const [sessionForums, setSessionForums] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showCalendar, setShowCalendar] = useState(true);

  const [studentAttendance, setStudentAttendance] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState({});

  const [showCbtPopup, setShowCbtPopup] = useState(false);
  const [showQuizPopup, setShowQuizPopup] = useState(false);
  const [selectedCbtSession, setSelectedCbtSession] = useState(null);
  const [selectedQuizSession, setSelectedQuizSession] = useState(null);

  const activeClasses = useMemo(() => {
    return teacherProfile?.classes || [
      { name: '8B' }, { name: '8C' }, { name: '8D' }, { name: '8E' }, { name: '8F' }
    ];
  }, [teacherProfile]);

  const handlePostSessionComment = (schId, sessionNum) => {
    if (!newCommentText.trim()) return;
    const forumKey = `${schId}_session_${sessionNum}`;
    const newComment = {
      author: teacherProfile?.full_name || 'Guru',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      text: newCommentText.trim()
    };
    setSessionForums(prev => ({
      ...prev,
      [forumKey]: [newComment, ...(prev[forumKey] || [])]
    }));
    setNewCommentText('');
  };

  const [createNewTaskModal, setCreateNewTaskModal] = useState(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxScore: 100
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [previewMaterialModal, setPreviewMaterialModal] = useState(null);

  const fetchStudentAttendance = async (classId, studentId = null) => {
    if (!classId) return;
    setLoadingAttendance(true);
    try {
      let url = `/attendance/class/${classId}`;
      if (studentId) {
        url += `/student/${studentId}`;
      }
      const res = await api.get(url);
      const attendanceData = res.data.data || res.data.attendance || [];
      
      const attendanceMap = {};
      attendanceData.forEach(a => {
        const sid = a.student_id?._id || a.student_id || a.student;
        if (!attendanceMap[sid]) {
          attendanceMap[sid] = [];
        }
        attendanceMap[sid].push(a);
      });
      setStudentAttendance(attendanceMap);
      
      const totalStudents = Object.keys(attendanceMap).length;
      const present = attendanceData.filter(a => a.status === 'hadir' || a.status === 'present').length;
      const absent = attendanceData.filter(a => a.status === 'tidak_hadir' || a.status === 'absent').length;
      const sick = attendanceData.filter(a => a.status === 'sakit' || a.status === 'sick').length;
      const permission = attendanceData.filter(a => a.status === 'izin' || a.status === 'permission').length;
      
      setAttendanceSummary({
        total: totalStudents,
        present,
        absent,
        sick,
        permission,
        percentage: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0
      });
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setStudentAttendance({});
      setAttendanceSummary({});
    } finally {
      setLoadingAttendance(false);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getDayEvents = (date) => {
    if (!date) return [];
    const dayName = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][date.getDay()];
    const daySchedules = displaySchedules.filter(s => 
      s.day && s.day.toUpperCase() === dayName
    );
    return daySchedules.map(s => ({
      title: s.subject || 'Mata Pelajaran',
      className: s.class_name || 'Kelas',
      time: `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`,
      isToday: date.toDateString() === new Date().toDateString()
    }));
  };

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const [uploadMaterialModal, setUploadMaterialModal] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleDirectUploadMaterialSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.title.trim() || !uploadMaterialModal) return;
    setUploadingFile(true);
    try {
      const sch = uploadMaterialModal.targetSchedule;
      const classId = sch.class_id?._id || sch.class_id || sch.id;
      const sessionNum = uploadMaterialModal.targetSessionNum || 1;

      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('class_id', classId);
      formData.append('session_number', sessionNum);
      formData.append('is_published', true);
      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
      }

      await api.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`Materi "${uploadForm.title}" berhasil diunggah dan terbit di Sesi ke-${sessionNum}!`);
      setUploadMaterialModal(null);
      setUploadForm({ title: '', description: '', file: null });

      if (activeCourseDetail) {
        fetchRealSessionData(activeCourseDetail.schedule, sessionNum);
      }
    } catch (err) {
      console.error('Error uploading material directly:', err);
      alert(err.response?.data?.message || err.message || 'Gagal mengunggah materi.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveNewTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim() || !createNewTaskModal) return;
    setCreatingTask(true);
    try {
      const sch = createNewTaskModal.targetSchedule;
      const classId = sch.class_id?._id || sch.class_id || sch.id;
      const sessionNum = createNewTaskModal.targetSessionNum || 1;

      await api.post('/assignments', {
        title: newTaskForm.title,
        description: newTaskForm.description,
        due_date: newTaskForm.dueDate,
        deadline: newTaskForm.dueDate,
        max_score: newTaskForm.maxScore,
        class_id: classId,
        class: classId,
        session_number: sessionNum
      });

      alert(`Tugas "${newTaskForm.title}" berhasil dibuat dan disematkan di Sesi ke-${sessionNum}!`);
      setCreateNewTaskModal(null);
      setNewTaskForm({
        title: '',
        description: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxScore: 100
      });

      if (activeCourseDetail) {
        fetchRealSessionData(activeCourseDetail.schedule, sessionNum);
      }
    } catch (err) {
      console.error('Error creating new task inline:', err);
      alert(err.response?.data?.message || err.message || 'Gagal membuat tugas baru.');
    } finally {
      setCreatingTask(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [courseRes, profileRes, dbSchedRes, attendanceSchedRes] = await Promise.allSettled([
        api.get('/courses'),
        api.get('/profile'),
        api.get('/schedules'),
        api.get('/attendance/schedules')
      ]);

      if (courseRes.status === 'fulfilled') setCourses(courseRes.value.data.courses || []);
      if (profileRes.status === 'fulfilled') setTeacherProfile(profileRes.value.data);
      if (dbSchedRes.status === 'fulfilled') setAllDbSchedules(dbSchedRes.value.data.data || []);
      if (attendanceSchedRes.status === 'fulfilled') setSchedules(attendanceSchedRes.value.data.schedules || []);

    } catch (error) {
      console.error('Error loading Modul Guru data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCourseDetail) {
      const sch = activeCourseDetail.schedule;
      const sessionNum = (activeCourseDetail.activeSessionIdx || 0) + 1;
      fetchRealSessionData(sch, sessionNum);
      if (activeCourseDetail.activeTab === 'peserta') {
        const classId = sch.class_id?._id || sch.class_id || sch.id;
        fetchStudentAttendance(classId);
      }
    }
  }, [activeCourseDetail?.schedule?.id, activeCourseDetail?.activeSessionIdx, activeCourseDetail?.activeTab]);

  useEffect(() => {
    if (activeCourseDetail && activeCourseDetail.schedule) {
      const sch = activeCourseDetail.schedule;
      const classId = (sch.class_id?._id || (typeof sch.class_id === 'string' ? sch.class_id : null) || sch.class || sch.id || '').toString();
      const tab = activeCourseDetail.activeTab || 'sesi';

      if (classId) {
        fetchClassStudents(classId);
        if (tab === 'asesmen') {
          fetchAllClassTasks(classId);
        } else if (tab === 'nilai') {
          fetchClassGrades(classId);
        } else if (tab === 'peserta') {
          fetchStudentAttendance(classId);
        }
      }
    }
  }, [activeCourseDetail?.schedule?.id, activeCourseDetail?.schedule?.class_id, activeCourseDetail?.activeTab]);

  const fetchRealSessionData = async (sch, sessionNum) => {
    setLoadingSessionData(true);
    try {
      const targetClassId = (sch.class_id?._id || sch.class_id || sch.id || '').toString();
      const targetClassName = (sch.class_name || sch.class || '').toString().toLowerCase().trim();

      const [matRes, taskRes] = await Promise.allSettled([
        api.get('/materials'),
        api.get('/assignments/guru/me')
      ]);

      if (matRes.status === 'fulfilled') {
        const allMats = matRes.value.data.data || matRes.value.data.materials || [];
        const filteredMats = allMats.filter(m => {
          const mClassId = (m.class_id?._id || m.class_id || '').toString();
          const mClassName = (m.class_name || m.class_id?.name || m.grade_level || '').toString().toLowerCase().trim();
          const isForThisClass = mClassId 
            ? (mClassId === targetClassId) 
            : (mClassName ? (mClassName === targetClassName || mClassName.includes(targetClassName) || targetClassName.includes(mClassName)) : true);
          return isForThisClass;
        });
        setSessionMaterials(filteredMats);
      } else {
        setSessionMaterials([]);
      }

      if (taskRes.status === 'fulfilled') {
        const allTasks = taskRes.value.data.data || [];
        const filteredTasks = allTasks.filter(t => {
          const tClassId = (t.class_id?._id || t.class_id || t.class || '').toString();
          const matchClass = tClassId ? (tClassId === targetClassId) : true;
          return matchClass;
        });
        setSessionAssignments(filteredTasks);
      } else {
        setSessionAssignments([]);
      }
    } catch (err) {
      console.error('Error fetching real session data:', err);
    } finally {
      setLoadingSessionData(false);
    }
  };

  const fetchClassStudents = async (classId) => {
    if (!classId) return;
    setLoadingClassStudents(true);
    try {
      let list = [];
      try {
        const res = await api.get(`/attendance/students/${classId}`);
        list = res.data.students || res.data.data || res.data || [];
      } catch (e1) {
        console.warn('Attendance students endpoint failed, trying fallback:', e1);
      }

      if (list.length === 0) {
        try {
          const res2 = await api.get('/users/students/all', { params: { class_id: classId } });
          list = res2.data.data || res2.data.students || [];
        } catch (e2) {
          console.warn('User students endpoint failed:', e2);
        }
      }

      if (list.length === 0) {
        try {
          const res3 = await api.get('/admin/monitoring/students', { params: { class_id: classId } });
          list = res3.data.data || res3.data.students || [];
        } catch (e3) {
          console.warn('Admin monitoring students endpoint failed:', e3);
        }
      }

      const mappedList = list.map((st, idx) => {
        let gender = st.gender || st.jenis_kelamin || st.jk || '';
        if (gender === 'L' || gender === 'l' || gender === 'Laki-laki') {
          gender = 'Laki-laki';
        } else if (gender === 'P' || gender === 'p' || gender === 'Perempuan') {
          gender = 'Perempuan';
        } else {
          gender = '-';
        }

        const studentAtt = studentAttendance[st._id] || [];

        return {
          _id: st._id || st.id || `temp_${idx}`,
          full_name: st.full_name || st.name || `Siswa ${idx + 1}`,
          name: st.full_name || st.name || `Siswa ${idx + 1}`,
          nisn: st.nisn || st.nis || st.username || '-',
          gender: gender,
          jenis_kelamin: gender,
          is_active: st.is_active !== undefined ? st.is_active : true,
          status: st.status || (st.is_active !== false ? 'Aktif' : 'Non-aktif'),
          attendance: studentAtt
        };
      });

      setClassStudents(mappedList);
    } catch (err) {
      console.error('Error fetching class students:', err);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const fetchAllClassTasks = async (classId) => {
    setLoadingAllClassTasks(true);
    try {
      const res = await api.get('/assignments/guru/me');
      const items = res.data.data || [];
      const cIdStr = (classId || '').toString();
      setAllClassTasks(items.filter(t => (t.class_id?._id || t.class_id || '').toString() === cIdStr));
    } catch (err) {
      console.error('Error fetching all class tasks:', err);
    } finally {
      setLoadingAllClassTasks(false);
    }
  };

  const fetchClassGrades = async (classId) => {
    if (!classId) return;
    setLoadingClassGrades(true);
    try {
      let stList = classStudents;
      if (stList.length === 0) {
        try {
          const resSt = await api.get(`/attendance/students/${classId}`);
          stList = resSt.data.students || resSt.data.data || [];
        } catch (e) {
          const resFallback = await api.get('/users/students/all', { params: { class_id: classId } });
          stList = resFallback.data.data || resFallback.data.students || [];
        }
      }

      let realGrades = [];
      try {
        const resGrades = await api.get(`/grades/rekap/class/${classId}`);
        realGrades = resGrades.data.data || resGrades.data.grades || [];
      } catch (e) {
        console.warn('Grades rekap endpoint returned empty or failed:', e);
      }

      const gradeMap = {};
      realGrades.forEach(g => {
        const sId = (g.student || g.student_id || '').toString();
        gradeMap[sId] = g;
      });

      const computedList = stList.map((st, idx) => {
        const sIdStr = (st._id || st.id || '').toString();
        const existingGrade = gradeMap[sIdStr] || {};

        const t1 = (existingGrade.t1 !== undefined && existingGrade.t1 !== null) ? existingGrade.t1 : '';
        const t2 = (existingGrade.t2 !== undefined && existingGrade.t2 !== null) ? existingGrade.t2 : '';
        const t3 = (existingGrade.t3 !== undefined && existingGrade.t3 !== null) ? existingGrade.t3 : '';

        const validTugas = [t1, t2, t3].filter(v => v !== '');
        const avgTugas = validTugas.length > 0 
          ? Math.round(validTugas.reduce((a, b) => Number(a) + Number(b), 0) / validTugas.length) 
          : '';

        const uts = (existingGrade.uts !== undefined && existingGrade.uts !== null) ? existingGrade.uts : '';
        const uas = (existingGrade.uas !== undefined && existingGrade.uas !== null) ? existingGrade.uas : '';

        let nilaiAkhir = '';
        if (avgTugas !== '' || uts !== '' || uas !== '') {
          const wAvg = avgTugas !== '' ? Number(avgTugas) * 0.4 : 0;
          const wUts = uts !== '' ? Number(uts) * 0.3 : 0;
          const wUas = uas !== '' ? Number(uas) * 0.3 : 0;
          nilaiAkhir = Math.round(wAvg + wUts + wUas);
        }

        return {
          _id: st._id,
          full_name: st.full_name || st.name || `Siswa ${idx + 1}`,
          student_name: st.full_name || st.name || `Siswa ${idx + 1}`,
          nisn: st.nisn || st.nis || st.username || '-',
          t1,
          t2,
          t3,
          avgTugas,
          uts,
          uas,
          nilai_akhir: nilaiAkhir
        };
      });

      setClassGrades(computedList);
    } catch (err) {
      console.error('Error fetching class grades:', err);
    } finally {
      setLoadingClassGrades(false);
    }
  };

  // ============================================================
  // BANK MATERIAL - CHECKLIST (MULTIPLE SELECT)
  // ============================================================
  const handleOpenBankMaterialModal = async (sch, sessionNum = 1) => {
    setBankMaterialModal({ targetSchedule: sch, targetSessionNum: sessionNum });
    setSelectedMaterialIds([]);
    setLoadingBankMaterials(true);
    try {
      const res = await api.get('/materials/guru/me');
      const items = res.data.data || res.data.materials || [];
      setBankMaterials(items);
    } catch (err) {
      console.error('Error fetching bank materials:', err);
    } finally {
      setLoadingBankMaterials(false);
    }
  };

  const handleToggleMaterialSelect = (materialId) => {
    setSelectedMaterialIds(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleSelectAllMaterials = () => {
    if (selectedMaterialIds.length === bankMaterials.length) {
      setSelectedMaterialIds([]);
    } else {
      setSelectedMaterialIds(bankMaterials.map(m => m._id));
    }
  };

  const handlePublishMaterialsToClassSession = async () => {
    if (selectedMaterialIds.length === 0 || !bankMaterialModal) {
      alert('Pilih minimal 1 materi!');
      return;
    }
    setPublishingMaterial(true);
    try {
      const targetClassId = bankMaterialModal.targetSchedule.class_id?._id || bankMaterialModal.targetSchedule.class_id || bankMaterialModal.targetSchedule.id;
      const sessionNum = bankMaterialModal.targetSessionNum || 1;

      await api.post('/materials/distribute-batch', {
        material_ids: selectedMaterialIds,
        class_id: targetClassId,
        session_number: sessionNum
      });

      alert(`Berhasil mengunggah ${selectedMaterialIds.length} materi dari Bank Materi ke Sesi ke-${sessionNum}!`);
      setBankMaterialModal(null);
      setSelectedMaterialIds([]);
      if (activeCourseDetail) {
        fetchRealSessionData(activeCourseDetail.schedule, sessionNum);
      }
    } catch (err) {
      console.error('Error publishing materials:', err);
      alert(err.response?.data?.message || 'Gagal mengunggah materi ke sesi kelas.');
    } finally {
      setPublishingMaterial(false);
    }
  };

  // ============================================================
  // TASK - CHECKLIST (MULTIPLE SELECT)
  // ============================================================
  const handleOpenTaskModal = async (sch, sessionNum = 1) => {
    setTaskModal({ targetSchedule: sch, targetSessionNum: sessionNum });
    setSelectedTaskIds([]);
    setLoadingTasks(true);
    try {
      const res = await api.get('/assignments/guru/me');
      const items = res.data.data || [];
      setTeacherTasks(items);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleToggleTaskSelect = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.length === teacherTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(teacherTasks.map(t => t._id));
    }
  };

  const handlePublishTasksToClassSession = async () => {
    if (selectedTaskIds.length === 0 || !taskModal) {
      alert('Pilih minimal 1 tugas!');
      return;
    }
    setPublishingMaterial(true);
    try {
      const targetClassId = taskModal.targetSchedule.class_id?._id || taskModal.targetSchedule.class_id || taskModal.targetSchedule.id;
      const sessionNum = taskModal.targetSessionNum || 1;

      // Kirim batch tugas ke sesi
      await api.post('/assignments/distribute-batch', {
        assignment_ids: selectedTaskIds,
        class_id: targetClassId,
        session_number: sessionNum
      });

      alert(`Berhasil menyematkan ${selectedTaskIds.length} tugas ke Sesi ke-${sessionNum}!`);
      setTaskModal(null);
      setSelectedTaskIds([]);
      if (activeCourseDetail) {
        fetchRealSessionData(activeCourseDetail.schedule, sessionNum);
      }
    } catch (err) {
      console.error('Error publishing tasks:', err);
      alert(err.response?.data?.message || 'Gagal menyematkan tugas ke sesi kelas.');
    } finally {
      setPublishingMaterial(false);
    }
  };

  const handleSavePlanForm = (e) => {
    e.preventDefault();
    if (!editingPlanModal) return;
    const key = `${editingPlanModal.schId}_session_${editingPlanModal.sessionNum}`;
    setSessionPlans(prev => ({
      ...prev,
      [key]: {
        rencana: planForm.rencana,
        realisasi: planForm.realisasi
      }
    }));
    alert(`Berhasil menyimpan Rencana Materi Sesi ke-${editingPlanModal.sessionNum}!`);
    setEditingPlanModal(null);
  };

  const toggleDropdown = (id) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  const handleOpenCbtPopup = (sch, sessionNum) => {
    setSelectedCbtSession({ schedule: sch, sessionNum });
    setShowCbtPopup(true);
  };

  const handleOpenQuizPopup = (sch, sessionNum) => {
    setSelectedQuizSession({ schedule: sch, sessionNum });
    setShowQuizPopup(true);
  };

  if (loading) return <div className="loading" style={{ padding: '30px', textAlign: 'center', color: '#0284c7', fontWeight: '800' }}>Memuat Modul Guru (KBM)...</div>;

  const filteredDbSchedules = allDbSchedules.filter(s => {
    const scheduleTeacherId = s.teacher_id?._id?.toString() || s.teacher_id?.toString() || '';
    const profileTeacherId = teacherProfile?._id?.toString() || '';
    const isMatch = scheduleTeacherId === profileTeacherId;
    return isMatch && (s.day || '').toUpperCase() === selectedDay.toUpperCase();
  });

  const rawSchedules = filteredDbSchedules.map((s, idx) => ({
    id: s._id,
    class_id: s.class_id?._id || s.class_id,
    class_name: s.class_id?.name || 'Kelas',
    subject: s.subject_id?.name || 'Informatika',
    day: s.day,
    start_time: s.start_time || '07:30',
    end_time: s.end_time || '09:30',
    room: s.room || ('Ruang Kelas ' + (s.class_id?.name || '')),
    pertemuan_ke: 9 + idx,
    presensi_count: 11 + idx,
    total_pertemuan: 16
  }));

  const mergeSchedules = (list) => {
    if (!list || list.length === 0) return [];
    const grouped = {};
    list.forEach((sch, idx) => {
      const key = `${sch.class_name}_${sch.subject}_${(sch.day || '').toUpperCase()}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...sch,
          start_time: sch.start_time || '07:30',
          end_time: sch.end_time || '09:30',
          pertemuan_list: [sch.pertemuan_ke || (9 + idx)]
        };
      } else {
        const existing = grouped[key];
        if (sch.start_time && sch.start_time < existing.start_time) {
          existing.start_time = sch.start_time;
        }
        if (sch.end_time && sch.end_time > existing.end_time) {
          existing.end_time = sch.end_time;
        }
        if (sch.pertemuan_ke) existing.pertemuan_list.push(sch.pertemuan_ke);
      }
    });

    return Object.values(grouped).map((item) => {
      const minP = Math.min(...item.pertemuan_list);
      const maxP = Math.max(...item.pertemuan_list);
      const labelP = minP === maxP ? `PERTEMUAN KE - ${minP}` : `PERTEMUAN KE - ${minP} & ${maxP}`;
      const durationMinutes = getMinutesDiff(item.start_time, item.end_time);
      const jp = calculateJP(item.start_time, item.end_time);
      const totalJp = `${jp} JP (${durationMinutes} menit)`;

      return {
        ...item,
        pertemuan_ke: minP,
        pertemuan_display: labelP,
        total_jp: totalJp,
        total_jp_raw: jp,
        duration_minutes: durationMinutes
      };
    });
  };

  const displaySchedules = mergeSchedules(rawSchedules);

  // RENDER DETAIL COURSE
  if (activeCourseDetail) {
    const sch = activeCourseDetail.schedule;
    const currentSesiIdx = activeCourseDetail.activeSessionIdx || 0;
    const currentSessionNum = currentSesiIdx + 1;
    const activeTab = activeCourseDetail.activeTab || 'sesi';
    const planKey = `${sch.id}_session_${currentSessionNum}`;
    const planData = sessionPlans[planKey] || { rencana: '', realisasi: '' };

    return (
      <div className="modul-guru-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <button 
          onClick={() => setActiveCourseDetail(null)}
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 16px', fontWeight: '800', color: '#0284c7', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
        >
          <span className="material-symbols-outlined">arrow_back</span> Kembali ke Daftar Modul Guru
        </button>

        {/* HEADER COURSE CARD */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>
                {sch.subject || sch.title || 'Mata Pelajaran'} ({sch.class_name || 'Kelas'})
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Kelas: {sch.class_name || 'Kelas'} | Sistem KBM Reguler
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Sekolah:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>SMP Negeri 1 Suradadi</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Periode Akademik:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                {(() => {
                  const now = new Date();
                  const month = now.getMonth();
                  const year = now.getFullYear();
                  const semester = month >= 6 ? 'Ganjil' : 'Genap';
                  return `${year}/${year + 1} ${semester}`;
                })()}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Peserta Kelas:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>{sch.students || classStudents.length || 0} Peserta Siswa</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Pengajar Utama:</span>
              <strong style={{ fontSize: '13px', color: '#1e293b' }}>{teacherProfile?.full_name || 'Guru'}</strong>
            </div>
          </div>

          {/* TAB BAR */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', overflowX: 'auto' }}>
            {[
              { id: 'sesi', label: 'Jadwal Pertemuan' },
              { id: 'asesmen', label: 'Tugas' },
              { id: 'peserta', label: 'Peserta Siswa' },
              { id: 'nilai', label: 'Laporan Nilai' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCourseDetail({ ...activeCourseDetail, activeTab: tab.id });
                  if (tab.id === 'peserta') {
                    const classId = sch.class_id?._id || sch.class_id || sch.id;
                    fetchStudentAttendance(classId);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #0284c7' : '3px solid transparent',
                  background: 'transparent',
                  color: activeTab === tab.id ? '#0284c7' : '#64748b',
                  fontWeight: activeTab === tab.id ? '800' : '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: PERTEMUAN KBM */}
        {activeTab === 'sesi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PILIH PERTEMUAN:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Array.from({ length: 16 }, (_, i) => {
                    const sessNum = i + 1;
                    const isActive = currentSesiIdx === i;
                    return (
                      <button
                        key={sessNum}
                        type="button"
                        onClick={() => setActiveCourseDetail({ ...activeCourseDetail, activeSessionIdx: i })}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: isActive ? 'none' : '1px solid #cbd5e1',
                          background: isActive ? '#2563eb' : '#ffffff',
                          color: isActive ? '#ffffff' : '#334155',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 4px 10px rgba(37, 99, 235, 0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {sessNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MAIN MEETING CARD */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                      {getMeetingDate(sch.day, currentSesiIdx).toLocaleDateString('id-ID', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </h2>
                    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: '1px solid #bfdbfe' }}>
                      {formatTime(sch.start_time)} - {formatTime(sch.end_time)} WIB
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                    Materi Minggu Ke-{currentSessionNum} • Kelas {sch.class_name}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanModal({ schId: sch.id, sessionNum: currentSessionNum });
                      setPlanForm({ rencana: planData.rencana || '', realisasi: '' });
                    }}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>edit</span> Edit Rencana
                  </button>
                  <button 
                    type="button"
                    onClick={() => navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}&session_number=${currentSessionNum}&mode=input`)}
                    style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>fact_check</span> Isi Presensi
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0284c7' }}>location_on</span> RENCANA MATERI PEMBELAJARAN
                </span>
                <p style={{ fontSize: '14px', fontStyle: planData.rencana ? 'normal' : 'italic', fontWeight: planData.rencana ? '700' : '400', color: planData.rencana ? '#0f172a' : '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  {planData.rencana || 'Belum ada deskripsi rencana materi yang dimasukkan untuk pertemuan ini. Silakan tambahkan rencana pembelajaran untuk membantu siswa bersiap.'}
                </p>
              </div>
            </div>

            {/* MATERI PEMBELAJARAN CARD */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#eab308' }}>folder</span> Materi Pembelajaran
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>DOKUMEN & REFERENSI</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenBankMaterialModal(sch, currentSessionNum)}
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span> + Pilih Dari Bank Materi
                </button>
              </div>

              {loadingSessionData ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat materi pertemuan...</div>
              ) : sessionMaterials.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessionMaterials.map((mat) => {
                    const fileExt = (mat.file_name || mat.file_url || '').split('.').pop().toLowerCase();
                    let iconName = 'description';
                    let badgeBg = '#e0f2fe';
                    let badgeColor = '#0284c7';

                    if (['pdf'].includes(fileExt)) {
                      iconName = 'picture_as_pdf';
                      badgeBg = '#fee2e2';
                      badgeColor = '#dc2626';
                    } else if (['doc', 'docx'].includes(fileExt)) {
                      iconName = 'description';
                      badgeBg = '#dbeafe';
                      badgeColor = '#2563eb';
                    } else if (['ppt', 'pptx'].includes(fileExt)) {
                      iconName = 'slideshow';
                      badgeBg = '#ffedd5';
                      badgeColor = '#ea580c';
                    }

                    const uploadDate = mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Baru diunggah';

                    return (
                      <div key={mat._id} style={{ padding: '16px 18px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{iconName}</span>
                          </div>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block', marginBottom: '3px' }}>{mat.title}</strong>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                              <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', color: '#334155' }}>
                                Kelas {sch.class_name}
                              </span>
                              <span>
                                Diunggah pada: <strong>{uploadDate} WIB</strong>
                              </span>
                              {mat.file_size && (
                                <span>({(mat.file_size / 1024 / 1024).toFixed(1)} MB)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPreviewMaterialModal(mat);
                            }}
                            style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span> Preview / Buka Dokumen
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#cbd5e1' }}>folder_off</span>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0 0' }}>
                    Belum ada materi yang diunggah untuk Pertemuan ke-{currentSessionNum}.
                  </p>
                </div>
              )}
            </div>

            {/* TUGAS PERTEMUAN */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>assignment</span>
                  Aktivitas & Tugas Pertemuan ke-{currentSessionNum}
                </strong>
                <button
                  onClick={() => handleOpenTaskModal(sch, currentSessionNum)}
                  style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> + Aktivitas / Tugas Pertemuan
                </button>
              </div>

              {loadingSessionData ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat tugas...</div>
              ) : sessionAssignments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessionAssignments.map((task) => (
                    <div key={task._id} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{task.title}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Tenggat: {new Date(task.due_date).toLocaleDateString('id-ID')}</span>
                      </div>
                      <button 
                        onClick={() => navigate('/dashboard/guru/assignments')}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#0284c7', cursor: 'pointer' }}
                      >
                        Lihat Pengumpulkan
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#cbd5e1' }}>assignment_late</span>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 0 0' }}>
                    Belum ada aktivitas atau tugas yang disematkan pada Pertemuan ke-{currentSessionNum}.
                  </p>
                </div>
              )}
            </div>

            {/* CBT - DENGAN POPUP */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>computer</span>
                  Ujian CBT Pertemuan ke-{currentSessionNum}
                </strong>
                <button
                  onClick={() => handleOpenCbtPopup(sch, currentSessionNum)}
                  style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>quiz</span> + Kelola CBT
                </button>
              </div>
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#cbd5e1' }}>laptop_mac</span>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Kelola dan terbitkan Ujian CBT dari <strong>Bank Master CBT</strong> untuk Pertemuan ke-{currentSessionNum}.
                </p>
              </div>
            </div>

            {/* Live Quiz - DENGAN POPUP */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>speed</span>
                  Live Quiz Interaktif Pertemuan ke-{currentSessionNum}
                </strong>
                <button
                  onClick={() => handleOpenQuizPopup(sch, currentSessionNum)}
                  style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bolt</span> + Kelola Quiz
                </button>
              </div>
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#cbd5e1' }}>extension</span>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Gunakan <strong>Bank Master Quiz</strong> untuk mendistribusikan kuis cepat interaktif pada Pertemuan ke-{currentSessionNum}.
                </p>
              </div>
            </div>

            {/* Forum Diskusi */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>forum</span>
                  Forum Diskusi & Tanya Jawab Sesi ke-{currentSessionNum}
                </strong>
              </div>

              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder={`Tulis pertanyaan atau pesan diskusi untuk Sesi ke-${currentSessionNum}...`}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePostSessionComment(sch.id, currentSessionNum); }}
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => handlePostSessionComment(sch.id, currentSessionNum)}
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span> Kirim
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {(sessionForums[`${sch.id}_session_${currentSessionNum}`] || []).length > 0 ? (
                  (sessionForums[`${sch.id}_session_${currentSessionNum}`] || []).map((comm, idx) => (
                    <div key={idx} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_circle</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{comm.author}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{comm.time}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#334155', margin: '4px 0 0 0' }}>{comm.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#cbd5e1' }}>chat_bubble_outline</span>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Belum ada tanggapan di Forum Diskusi Sesi ke-{currentSessionNum}. Jadilah yang pertama memulai diskusi!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASESMEN / TUGAS */}
        {activeTab === 'asesmen' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                  Tugas Kelas {sch.class_name}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Daftar seluruh penugasan dan latihan khusus untuk mata pelajaran <strong>{sch.subject} ({sch.class_name})</strong>.
                </p>
              </div>
              <button 
                onClick={() => handleOpenTaskModal(sch, 1)}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined">add</span> + Buat / Sematkan Tugas Baru
              </button>
            </div>

            {loadingAllClassTasks ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#0284c7' }}>Memuat daftar tugas kelas...</div>
            ) : allClassTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allClassTasks.map(t => (
                  <div key={t._id} style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>{t.title}</h4>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Sesi Pertemuan ke-{t.session_number || 1} | Tenggat: {new Date(t.due_date).toLocaleDateString('id-ID')}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/dashboard/guru/assignments')}
                      style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Lihat Pengumpulan
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#cbd5e1' }}>assignment</span>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0 0 0' }}>Belum ada tugas atau asesmen yang dibuat untuk Kelas {sch.class_name}.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: PESERTA SISWA - KOLOM PER PERTEMUAN (P1-P16)
            ============================================================ */}
        {activeTab === 'peserta' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                  Daftar Siswa Kelas {sch.class_name}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Terdaftar {classStudents.length} siswa aktif pada Kelas {sch.class_name}
                </p>
              </div>
              {attendanceSummary.total > 0 && (
                <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>✅ Hadir: {attendanceSummary.present || 0}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>❌ Alfa: {attendanceSummary.absent || 0}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b' }}>🤒 Sakit: {attendanceSummary.sick || 0}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6' }}>📝 Izin: {attendanceSummary.permission || 0}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7' }}>📊 {attendanceSummary.percentage || 0}%</span>
                </div>
              )}
            </div>

            {loadingClassStudents ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#0284c7' }}>Memuat daftar peserta siswa...</div>
            ) : classStudents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', color: '#475569', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>No</th>
                      <th style={{ padding: '8px 10px', color: '#475569', position: 'sticky', left: 36, background: '#f8fafc', zIndex: 2 }}>NISN</th>
                      <th style={{ padding: '8px 10px', color: '#475569', position: 'sticky', left: 120, background: '#f8fafc', zIndex: 2 }}>Nama Siswa</th>
                      <th style={{ padding: '8px 10px', color: '#475569', textAlign: 'center' }}>JK</th>
                      {Array.from({ length: 16 }, (_, i) => (
                        <th key={i} style={{ padding: '4px 4px', textAlign: 'center', color: '#475569', fontSize: '10px', minWidth: '30px' }}>
                          P{i + 1}
                        </th>
                      ))}
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: '#0284c7', fontWeight: '800' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((st, idx) => {
                      const attendanceMap = {};
                      (st.attendance || []).forEach(a => {
                        const sessionNum = a.session_number || 1;
                        attendanceMap[sessionNum] = a.status;
                      });

                      let hadir = 0, sakit = 0, izin = 0, alfa = 0;
                      for (let i = 1; i <= 16; i++) {
                        const status = attendanceMap[i] || '';
                        if (status === 'hadir' || status === 'present') hadir++;
                        else if (status === 'sakit' || status === 'sick') sakit++;
                        else if (status === 'izin' || status === 'permission') izin++;
                        else if (status === 'tidak_hadir' || status === 'absent' || status === 'alfa') alfa++;
                      }
                      const total = hadir + sakit + izin + alfa;
                      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

                      return (
                        <tr key={st._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: '700', color: '#64748b', position: 'sticky', left: 0, background: '#ffffff', zIndex: 1 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: '600', position: 'sticky', left: 36, background: '#ffffff', zIndex: 1 }}>{st.nisn || '-'}</td>
                          <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: '700', position: 'sticky', left: 120, background: '#ffffff', zIndex: 1 }}>{st.full_name || st.name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {st.gender === 'Laki-laki' ? 'L' : st.gender === 'Perempuan' ? 'P' : '-'}
                          </td>
                          {Array.from({ length: 16 }, (_, i) => {
                            const sessionNum = i + 1;
                            const status = attendanceMap[sessionNum] || '';
                            let bgColor = '#f1f5f9';
                            let label = '-';
                            let textColor = '#94a3b8';

                            if (status === 'hadir' || status === 'present') {
                              bgColor = '#dcfce7';
                              label = 'H';
                              textColor = '#16a34a';
                            } else if (status === 'sakit' || status === 'sick') {
                              bgColor = '#fef3c7';
                              label = 'S';
                              textColor = '#d97706';
                            } else if (status === 'izin' || status === 'permission') {
                              bgColor = '#dbeafe';
                              label = 'I';
                              textColor = '#2563eb';
                            } else if (status === 'tidak_hadir' || status === 'absent' || status === 'alfa') {
                              bgColor = '#fee2e2';
                              label = 'A';
                              textColor = '#dc2626';
                            }

                            return (
                              <td key={i} style={{ padding: '4px 2px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '26px',
                                  height: '26px',
                                  lineHeight: '26px',
                                  borderRadius: '6px',
                                  background: bgColor,
                                  color: textColor,
                                  fontWeight: '800',
                                  fontSize: '10px',
                                  textAlign: 'center'
                                }}>
                                  {label}
                                </span>
                              </td>
                            );
                          })}
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: percentage >= 75 ? '#16a34a' : percentage >= 50 ? '#f59e0b' : '#dc2626' }}>
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                  ⬅️ Geser untuk melihat semua pertemuan ➡️
                </div>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Keterangan:</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', lineHeight: '18px', textAlign: 'center', borderRadius: '4px', background: '#dcfce7', color: '#16a34a', fontWeight: '800', fontSize: '9px' }}>H</span> Hadir
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', lineHeight: '18px', textAlign: 'center', borderRadius: '4px', background: '#fef3c7', color: '#d97706', fontWeight: '800', fontSize: '9px' }}>S</span> Sakit
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', lineHeight: '18px', textAlign: 'center', borderRadius: '4px', background: '#dbeafe', color: '#2563eb', fontWeight: '800', fontSize: '9px' }}>I</span> Izin
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', lineHeight: '18px', textAlign: 'center', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: '800', fontSize: '9px' }}>A</span> Alfa
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                    <span style={{ display: 'inline-block', width: '18px', height: '18px', lineHeight: '18px', textAlign: 'center', borderRadius: '4px', background: '#f1f5f9', color: '#94a3b8', fontWeight: '800', fontSize: '9px' }}>-</span> Belum Ada
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                Belum ada data siswa terdaftar di Kelas {sch.class_name}.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LAPORAN NILAI */}
        {activeTab === 'nilai' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                  Laporan Rekapitulasi Nilai Kelas {sch.class_name}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Rekapitulasi Nilai Tugas (T1, T2, T3), Rata-rata Tugas, UTS, dan UAS Mata Pelajaran <strong>{sch.subject} ({sch.class_name})</strong>.
                </p>
              </div>
              <button 
                onClick={() => {
                  const listData = classGrades.length > 0 ? classGrades : classStudents;
                  let csv = "No,Nama Siswa,T1,T2,T3,Rata-rata Tugas,Nilai UTS,Nilai UAS,Nilai Akhir\n";
                  listData.forEach((st, idx) => {
                    const name = `"${st.full_name || st.student_name || st.name || ('Siswa ' + (idx + 1))}"`;
                    const t1 = (st.t1 !== undefined && st.t1 !== null && st.t1 !== '') ? st.t1 : '';
                    const t2 = (st.t2 !== undefined && st.t2 !== null && st.t2 !== '') ? st.t2 : '';
                    const t3 = (st.t3 !== undefined && st.t3 !== null && st.t3 !== '') ? st.t3 : '';
                    const avgTugas = (st.avgTugas !== undefined && st.avgTugas !== null && st.avgTugas !== '') ? st.avgTugas : '';
                    const uts = (st.uts !== undefined && st.uts !== null && st.uts !== '') ? st.uts : '';
                    const uas = (st.uas !== undefined && st.uas !== null && st.uas !== '') ? st.uas : '';
                    const nilaiAkhir = (st.nilai_akhir !== undefined && st.nilai_akhir !== null && st.nilai_akhir !== '') ? st.nilai_akhir : '';
                    csv += `${idx + 1},${name},${t1},${t2},${t3},${avgTugas},${uts},${uas},${nilaiAkhir}\n`;
                  });
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `Rekap_Nilai_Semester_${sch.subject}_${sch.class_name}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)' }}
              >
                <span className="material-symbols-outlined">download</span> Unduh Rekap Nilai Semester (.csv)
              </button>
            </div>

            {loadingClassGrades ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#0284c7' }}>Memuat rekapitulasi nilai...</div>
            ) : classGrades.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px', color: '#475569' }}>No</th>
                      <th style={{ padding: '12px', color: '#475569' }}>Nama Siswa</th>
                      <th style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>T1</th>
                      <th style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>T2</th>
                      <th style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>T3</th>
                      <th style={{ padding: '12px', color: '#0284c7', fontWeight: '800' }}>Rata-rata Tugas</th>
                      <th style={{ padding: '12px', color: '#475569' }}>Nilai UTS</th>
                      <th style={{ padding: '12px', color: '#475569' }}>Nilai UAS</th>
                      <th style={{ padding: '12px', color: '#475569' }}>Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classGrades.map((st, idx) => (
                      <tr key={st._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '12px', color: '#0f172a', fontWeight: '800' }}>{st.full_name || st.student_name || st.name}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700' }}>{st.t1 !== undefined && st.t1 !== null && st.t1 !== '' ? st.t1 : '-'}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700' }}>{st.t2 !== undefined && st.t2 !== null && st.t2 !== '' ? st.t2 : '-'}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700' }}>{st.t3 !== undefined && st.t3 !== null && st.t3 !== '' ? st.t3 : '-'}</td>
                        <td style={{ padding: '12px', color: '#0284c7', fontWeight: '800' }}>{st.avgTugas !== undefined && st.avgTugas !== null && st.avgTugas !== '' ? st.avgTugas : '-'}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{st.uts !== undefined && st.uts !== null && st.uts !== '' ? st.uts : '-'}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{st.uas !== undefined && st.uas !== null && st.uas !== '' ? st.uas : '-'}</td>
                        <td style={{ padding: '12px', fontWeight: '800', color: '#16a34a' }}>{st.nilai_akhir !== undefined && st.nilai_akhir !== null && st.nilai_akhir !== '' ? st.nilai_akhir : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                Belum ada data nilai untuk Kelas {sch.class_name}.
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            MODAL BANK MATERI - CHECKLIST (MULTIPLE SELECT)
            ============================================================ */}
        {bankMaterialModal && (
          <div className="modal-backdrop" onClick={() => setBankMaterialModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '640px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>library_books</span>
                  Pilih Materi dari Bank Materi
                </h3>
                <button onClick={() => setBankMaterialModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                  Pilih materi dari Bank Materi untuk <strong>Kelas {bankMaterialModal.targetSchedule.class_name}</strong> (Sesi ke-{bankMaterialModal.targetSessionNum || 1})
                </p>

                {loadingBankMaterials ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat koleksi Bank Materi...</div>
                ) : bankMaterials.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={selectedMaterialIds.length === bankMaterials.length && bankMaterials.length > 0}
                          onChange={handleSelectAllMaterials}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {selectedMaterialIds.length === bankMaterials.length ? 'Batalkan Semua' : 'Pilih Semua'} ({bankMaterials.length} materi)
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                      {bankMaterials.map((mat) => (
                        <label
                          key={mat._id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: selectedMaterialIds.includes(mat._id) ? '2px solid #0284c7' : '1px solid #e2e8f0',
                            background: selectedMaterialIds.includes(mat._id) ? '#f0f9ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(mat._id)}
                            onChange={() => handleToggleMaterialSelect(mat._id)}
                            style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{mat.title}</strong>
                              <span style={{ fontSize: '10px', fontWeight: '800', background: mat.source_type === 'ai' ? '#f0fdf4' : '#eff6ff', color: mat.source_type === 'ai' ? '#166534' : '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>
                                {mat.source_type === 'ai' ? '🤖 AI' : '📄 Manual'}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {mat.description || 'Tanpa deskripsi'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                    Belum ada materi di Bank Materi.
                  </div>
                )}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button onClick={() => setBankMaterialModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button
                  onClick={handlePublishMaterialsToClassSession}
                  disabled={publishingMaterial || selectedMaterialIds.length === 0}
                  style={{
                    background: publishingMaterial || selectedMaterialIds.length === 0 ? '#94a3b8' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: publishingMaterial || selectedMaterialIds.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {publishingMaterial ? 'Mengunggah...' : `Upload ${selectedMaterialIds.length} Materi`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            MODAL TASK - CHECKLIST (MULTIPLE SELECT)
            ============================================================ */}
        {taskModal && (
          <div className="modal-backdrop" onClick={() => setTaskModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '640px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>assignment</span>
                  Pilih Tugas untuk Kelas {taskModal.targetSchedule.class_name}
                </h3>
                <button onClick={() => setTaskModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                  Pilih tugas untuk <strong>Kelas {taskModal.targetSchedule.class_name}</strong> (Sesi ke-{taskModal.targetSessionNum || 1})
                </p>

                {loadingTasks ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#0284c7' }}>Memuat daftar tugas...</div>
                ) : teacherTasks.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.length === teacherTasks.length && teacherTasks.length > 0}
                          onChange={handleSelectAllTasks}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {selectedTaskIds.length === teacherTasks.length ? 'Batalkan Semua' : 'Pilih Semua'} ({teacherTasks.length} tugas)
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                      {teacherTasks.map((task) => (
                        <label
                          key={task._id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: selectedTaskIds.includes(task._id) ? '2px solid #0284c7' : '1px solid #e2e8f0',
                            background: selectedTaskIds.includes(task._id) ? '#f0f9ff' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.includes(task._id)}
                            onChange={() => handleToggleTaskSelect(task._id)}
                            style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{task.title}</strong>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Tenggat: {new Date(task.due_date).toLocaleDateString('id-ID')}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                    Belum ada tugas yang dibuat.
                  </div>
                )}
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button onClick={() => setTaskModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button
                  onClick={handlePublishTasksToClassSession}
                  disabled={publishingMaterial || selectedTaskIds.length === 0}
                  style={{
                    background: publishingMaterial || selectedTaskIds.length === 0 ? '#94a3b8' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: publishingMaterial || selectedTaskIds.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {publishingMaterial ? 'Menyematkan...' : `Sematkan ${selectedTaskIds.length} Tugas`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDIT RENCANA */}
        {editingPlanModal && (
          <div className="modal-backdrop" onClick={() => setEditingPlanModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '540px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  Edit Rencana Materi (Sesi ke-{editingPlanModal.sessionNum})
                </h3>
                <button onClick={() => setEditingPlanModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSavePlanForm}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Rencana Materi Sesi:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengenalan Konsep Dasar KBM & Silabus Kurikulum"
                    value={planForm.rencana}
                    onChange={(e) => setPlanForm({ ...planForm, rencana: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Realisasi Materi Sesi:</label>
                  <textarea
                    placeholder="Contoh: Penjelasan modul dan evaluasi KBM pertemuan ke-1"
                    rows="3"
                    value={planForm.realisasi}
                    onChange={(e) => setPlanForm({ ...planForm, realisasi: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setEditingPlanModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                  <button type="submit" style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>Simpan Perubahan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* POPUP CBT */}
        {showCbtPopup && selectedCbtSession && (
          <div className="modal-backdrop" onClick={() => setShowCbtPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '500px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📝 Kelola Ujian CBT</h3>
                <button onClick={() => setShowCbtPopup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#64748b' }}>close</span>
                </button>
              </div>
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#0284c7' }}>quiz</span>
                <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '12px 0 4px 0' }}>Bank Ujian CBT</h4>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Kelola bank soal dan terbitkan ujian untuk <br />
                  <strong>{selectedCbtSession.schedule.subject || 'Mata Pelajaran'}</strong> - Pertemuan ke-{selectedCbtSession.sessionNum}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => setShowCbtPopup(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Tutup</button>
                <button onClick={() => { setShowCbtPopup(false); navigate('/dashboard/guru/cbt'); }} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                  Buka Bank CBT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP QUIZ */}
        {showQuizPopup && selectedQuizSession && (
          <div className="modal-backdrop" onClick={() => setShowQuizPopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '500px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>⚡ Kelola Live Quiz</h3>
                <button onClick={() => setShowQuizPopup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#64748b' }}>close</span>
                </button>
              </div>
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#7c3aed' }}>bolt</span>
                <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '12px 0 4px 0' }}>Bank Live Quiz</h4>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Kelola bank soal quiz dan terbitkan untuk <br />
                  <strong>{selectedQuizSession.schedule.subject || 'Mata Pelajaran'}</strong> - Pertemuan ke-{selectedQuizSession.sessionNum}
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => setShowQuizPopup(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Tutup</button>
                <button onClick={() => { setShowQuizPopup(false); navigate('/dashboard/guru/quiz'); }} style={{ background: '#7c3aed', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                  Buka Bank Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP PREVIEW MATERI */}
        {previewMaterialModal && (
          <div className="modal-backdrop" onClick={() => setPreviewMaterialModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '750px', width: '92%', maxHeight: '88vh', borderRadius: '20px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '24px' }}>description</span> Preview Materi: {previewMaterialModal.title}
                </h3>
                <button onClick={() => setPreviewMaterialModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#64748b' }}>close</span>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                {previewMaterialModal.description && (
                  <div style={{ fontSize: '13px', color: '#334155', marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Deskripsi & Petunjuk:</strong>
                    {previewMaterialModal.description}
                  </div>
                )}
                {previewMaterialModal.content && (
                  <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.7', marginBottom: '16px', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }} dangerouslySetInnerHTML={{ __html: previewMaterialModal.content }} />
                )}
                {previewMaterialModal.file_url ? (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '14px', overflow: 'hidden', minHeight: '300px', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    {previewMaterialModal.file_url.endsWith('.pdf') ? (
                      <iframe src={previewMaterialModal.file_url} title="Preview File PDF" style={{ width: '100%', height: '450px', border: 'none' }} />
                    ) : previewMaterialModal.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={previewMaterialModal.file_url} alt="Preview Materi" style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '10px' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#0284c7' }}>file_present</span>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '10px 0 4px 0' }}>{previewMaterialModal.file_name || 'Dokumen Materi'}</h4>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Berkas ini siap diakses atau diunduh.</p>
                        <a href={previewMaterialModal.file_url} target="_blank" rel="noreferrer" style={{ background: '#0284c7', color: '#ffffff', textDecoration: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span> Unduh / Buka
                        </a>
                      </div>
                    )}
                  </div>
                ) : previewMaterialModal.external_link ? (
                  <div style={{ padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px' }}>
                    <strong style={{ fontSize: '13px', color: '#0369a1', display: 'block', marginBottom: '6px' }}>Tautan Eksternal:</strong>
                    <a href={previewMaterialModal.external_link} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontSize: '13px', fontWeight: '700', wordBreak: 'break-all' }}>{previewMaterialModal.external_link}</a>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>menu_book</span>
                    <p style={{ fontSize: '14px', fontWeight: '700', margin: '8px 0 0 0' }}>Materi ini berisi ringkasan judul & petunjuk.</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                {previewMaterialModal.file_url && (
                  <a href={previewMaterialModal.file_url} target="_blank" rel="noreferrer" style={{ background: '#0284c7', color: '#ffffff', textDecoration: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span> Buka di Tab Baru
                  </a>
                )}
                <button onClick={() => setPreviewMaterialModal(null)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // MAIN PAGE RENDER
  // ============================================================
  return (
    <div className="modul-guru-container" style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto' }}>
      <div className="modul-guru-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="modul-title" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Jadwal Mengajar (KBM)
          </h1>
          <p className="modul-subtitle" style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Kelola bahan ajar, dan kelas mengajar Anda untuk hari <strong>{selectedDay}</strong> ({displaySchedules.length} Kelas Sesi).
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              border: 'none',
              background: selectedDay === day ? '#0284c7' : '#ffffff',
              color: selectedDay === day ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: selectedDay === day ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {day === getCurrentDayName() && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedDay === day ? '#ffffff' : '#16a34a' }}></span>
            )}
            {day}
          </button>
        ))}
      </div>

      <div className="modul-guru-grid-layout" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div className="modul-main-column" style={{ flex: 1 }}>
          <div className="status-session-banner" style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">sensors</span>
            <span>Sesi KBM Hari Ini Berlangsung Aktif</span>
          </div>

          <div className="schedules-card-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displaySchedules.length > 0 ? (
              displaySchedules.map((sch, index) => {
                const schId = sch.id || index;
                const meetingNum = sch.pertemuan_ke || (7 + index);
                const targetSessionIdx = Math.max(0, Math.min(15, meetingNum - 1));
                const planKey = `${sch.id}_session_${meetingNum}`;
                const planData = sessionPlans[planKey];

                const jp = calculateJP(sch.start_time, sch.end_time);
                const duration = getMinutesDiff(sch.start_time, sch.end_time);

                return (
                  <div key={schId} className="teaching-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    <div 
                      className="card-top-header"
                      onClick={() => setActiveCourseDetail({ schedule: sch, activeSessionIdx: targetSessionIdx, activeTab: 'sesi' })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-subject-info">
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          {sch.subject || 'Mata Pelajaran'} ({sch.class_name || 'Kelas'})
                        </h3>
                      </div>
                      <div className="sks-badge" style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined">bookmark</span>
                        {sch.total_jp || `${jp} JP (${duration} menit)`}
                      </div>
                    </div>

                    <div 
                      className="card-info-grid"
                      onClick={() => setActiveCourseDetail({ schedule: sch, activeSessionIdx: targetSessionIdx, activeTab: 'sesi' })}
                      style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}
                    >
                      <div className="info-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>schedule</span>
                        <div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', display: 'block' }}>Waktu</span>
                          <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{formatTime(sch.start_time)} - {formatTime(sch.end_time)} WIB</p>
                        </div>
                      </div>

                      <div className="info-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>meeting_room</span>
                        <div>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', display: 'block' }}>Ruangan</span>
                          <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{sch.room || ('Ruang Kelas ' + sch.class_name)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="card-action-bar" style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-action-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/guru/attendance?schedule_id=${sch.id || ''}&session_number=${meetingNum}&mode=input`);
                        }}
                        style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined">edit_calendar</span> Perbaharui Presensi
                      </button>

                      <button
                        className="btn-action-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBankMaterialModal(sch, meetingNum);
                        }}
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined">library_books</span> Distribusikan Materi (Popup)
                      </button>

                      <button
                        className="btn-action-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTaskModal(sch, meetingNum);
                        }}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="material-symbols-outlined">assignment</span> Distribusikan Tugas (Popup)
                      </button>

                      <div className="dropdown-action-wrapper" style={{ position: 'relative' }}>
                        <button
                          className="btn-action-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(schId);
                          }}
                          style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          Opsi Lainnya
                          <span className="material-symbols-outlined">expand_more</span>
                        </button>

                        {openDropdownId === schId && (
                          <div className="dropdown-options-menu" style={{ position: 'absolute', right: 0, top: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '180px', padding: '6px' }}>
                            <button 
                              onClick={() => {
                                setActiveCourseDetail({ schedule: sch, activeSessionIdx: targetSessionIdx, activeTab: 'nilai' });
                                setOpenDropdownId(null);
                              }} 
                              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span className="material-symbols-outlined">edit_note</span> Input Nilai Ujian
                            </button>
                            <button 
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleOpenCbtPopup(sch, meetingNum);
                              }} 
                              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '700', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span className="material-symbols-outlined">quiz</span> Ujian CBT
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '48px 24px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>event_busy</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '12px 0 4px 0' }}>Tidak Ada Jadwal Mengajar pada Hari {selectedDay}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Anda tidak memiliki jadwal KBM pada hari ini. Silakan pilih hari lain atau tampilkan hari reguler.</p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="modul-side-column" style={{ flex: '0 0 340px' }}>
          <div className="teacher-profile-summary-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Hai, {teacherProfile?.full_name || 'Guru'}</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Beban: <strong>
                    {allDbSchedules.filter(s => {
                      const scheduleTeacherId = s.teacher_id?._id?.toString() || s.teacher_id?.toString() || '';
                      const profileTeacherId = teacherProfile?._id?.toString() || '';
                      return scheduleTeacherId === profileTeacherId;
                    }).length} JP
                  </strong>
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', display: 'block' }}>{classStudents.length || 0}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Siswa Binaan</span>
              </div>
              <div style={{ borderRight: '1px solid #cbd5e1' }}></div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', display: 'block' }}>{activeClasses.length}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Kelas Mengajar</span>
              </div>
            </div>
          </div>

          {/* MINI CALENDAR */}
          <div className="mini-calendar-card" style={{ 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #cbd5e1', 
            padding: '16px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0284c7' }}>calendar_month</span>
                Kalender Jadwal
              </h4>
              <button 
                onClick={goToToday}
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#0284c7',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Hari Ini
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px', padding: '4px' }}>◀</button>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
              <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '18px', padding: '4px' }}>▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
              {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, idx) => (
                <div key={idx} style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', padding: '4px 0', textTransform: 'uppercase' }}>{day}</div>
              ))}
              {generateCalendarDays().map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} style={{ padding: '4px' }}></div>;
                const isTodayDate = isToday(date);
                const dayEvents = getDayEvents(date);
                const hasEvent = dayEvents.length > 0;
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '4px 2px',
                      position: 'relative',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      background: isTodayDate ? '#0284c7' : (hasEvent ? '#f0f9ff' : 'transparent'),
                      color: isTodayDate ? '#ffffff' : (hasEvent ? '#0284c7' : '#334155'),
                      fontWeight: isTodayDate ? '800' : (hasEvent ? '700' : '400'),
                      transition: 'all 0.2s ease',
                      border: hasEvent && !isTodayDate ? '1px solid #bfdbfe' : 'none'
                    }}
                    onClick={() => {
                      const dayName = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][date.getDay()];
                      if (dayName !== 'MINGGU' && displaySchedules.some(s => s.day === dayName)) {
                        setSelectedDay(dayName);
                      }
                    }}
                    title={dayEvents.map(e => `${e.title} (${e.className})`).join('\n')}
                  >
                    {date.getDate()}
                    {hasEvent && !isTodayDate && (
                      <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#0284c7', display: 'block' }}></span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7', display: 'inline-block' }}></span> Ada Jadwal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7', display: 'inline-block', border: '2px solid #0284c7' }}></span> Hari Ini
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0', display: 'inline-block' }}></span> Tidak Ada
              </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                📋 Jadwal {selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()} Ini:
              </span>
              {displaySchedules.length > 0 ? (
                displaySchedules.slice(0, 3).map((sch, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#f8fafc', borderRadius: '6px', marginBottom: '4px', fontSize: '11px' }}>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{sch.subject}</span>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>{sch.class_name}</span>
                    <span style={{ color: '#94a3b8', fontSize: '9px' }}>{formatTime(sch.start_time)}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>Tidak ada jadwal hari ini</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* POPUP UPLOAD MATERIAL */}
      {uploadMaterialModal && (
        <div className="modal-backdrop" onClick={() => setUploadMaterialModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '560px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>upload_file</span> Upload File Materi
              </h3>
              <button onClick={() => setUploadMaterialModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleDirectUploadMaterialSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Judul Materi *</label>
                <input type="text" required placeholder="Contoh: Modul 1 - Pengenalan Pemrograman Dasar" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Deskripsi / Ringkasan</label>
                <textarea rows="3" placeholder="Tuliskan petunjuk atau ringkasan singkat materi ini..." value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Pilih File (PDF, DOCX, PPTX, JPG, PNG)</label>
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setUploadMaterialModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={uploadingFile} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                  {uploadingFile ? 'Mengunggah...' : 'Upload & Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP CREATE NEW TASK */}
      {createNewTaskModal && (
        <div className="modal-backdrop" onClick={() => setCreateNewTaskModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', maxWidth: '560px', width: '90%', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0284c7' }}>edit_document</span> Buat Tugas Baru
              </h3>
              <button onClick={() => setCreateNewTaskModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveNewTaskSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Judul Tugas *</label>
                <input type="text" required placeholder="Contoh: Tugas 1 - Pendahuluan Algoritma" value={newTaskForm.title} onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Deskripsi</label>
                <textarea rows="3" placeholder="Tuliskan instruksi tugas..." value={newTaskForm.description} onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Tenggat *</label>
                  <input type="date" required value={newTaskForm.dueDate} onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>Skor Maksimal</label>
                  <input type="number" value={newTaskForm.maxScore} onChange={(e) => setNewTaskForm({ ...newTaskForm, maxScore: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setCreateNewTaskModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Batal</button>
                <button type="submit" disabled={creatingTask} style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                  {creatingTask ? 'Menyimpan...' : 'Simpan & Sematkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruCourses;