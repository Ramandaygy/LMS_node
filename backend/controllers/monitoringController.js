// monitoringController.js (placeholder)
exports.predictStudent = async (req, res) => {
  try {
    const { scores } = req.body;
    if (!scores || scores.length !== 11) {
      return res.status(400).json({ error: 'Harus 11 nilai mata pelajaran' });
    }
    // Dummy prediction
    const categories = ['Rendah', 'Sedang', 'Tinggi'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const randomProbs = [0.1, 0.7, 0.2];
    res.json({
      category: randomCat,
      probability: randomProbs,
      class_labels: categories
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.predictClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const students = await User.find({ role: 'siswa', 'profile.classId': classId });
    if (!students.length) return res.status(404).json({ error: 'Kelas tidak ditemukan atau tidak ada siswa' });

    const predictions = students.map(s => ({
      student_id: s._id,
      name: s.name,
      nis: s.profile?.nis,
      prediction: 'Sedang', // dummy
      probability: [0.1, 0.7, 0.2]
    }));
    res.json({ predictions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};