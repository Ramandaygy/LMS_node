import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const GuruMonitoring = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
    try {
      const res = await api.get('/guru/profile');
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentsAndPredict = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      // Ambil siswa di kelas
      const studentsRes = await api.get(`/guru/classes/${selectedClass}/students`);
      setStudents(studentsRes.data.students);
      // Lakukan prediksi per siswa (bisa satu per satu atau batch)
      const preds = {};
      for (const student of studentsRes.data.students) {
        // Di sini kita asumsikan ada data nilai siswa, untuk sementara dummy
        // Ganti dengan panggilan ke endpoint prediksi per siswa
        const predRes = await api.post('/monitoring/predict/student', {
          scores: [80,80,80,80,80,80,80,80,80,80,80] // dummy
        });
        preds[student.id] = predRes.data;
      }
      setPredictions(preds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) fetchStudentsAndPredict();
  }, [selectedClass]);

  const getCategoryColor = (cat) => {
    if (cat === 'Tinggi') return 'text-green-600 bg-green-100';
    if (cat === 'Sedang') return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 Monitoring Prestasi Siswa</h1>
      <div className="mb-4">
        <label className="block mb-2">Pilih Kelas:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border rounded p-2 w-64"
        >
          <option value="">-- Pilih Kelas --</option>
          {classes.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>
      {loading && <div>Memuat prediksi...</div>}
      {students.length > 0 && (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Nama</th>
              <th className="py-2 px-4 border">NIS</th>
              <th className="py-2 px-4 border">Prediksi Prestasi</th>
              <th className="py-2 px-4 border">Probabilitas</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const pred = predictions[student.id] || {};
              return (
                <tr key={student.id}>
                  <td className="py-2 px-4 border">{student.full_name}</td>
                  <td className="py-2 px-4 border">{student.nis}</td>
                  <td className="py-2 px-4 border">
                    <span className={`px-2 py-1 rounded ${getCategoryColor(pred.category)}`}>
                      {pred.category || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-4 border">
                    {pred.probability ? pred.probability.map((p, i) => (
                      <span key={i} className="mr-2">{pred.class_labels[i]}: {(p*100).toFixed(0)}%</span>
                    )) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default GuruMonitoring;