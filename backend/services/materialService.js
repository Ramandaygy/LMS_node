// services/materialService.js
const Material = require('../models/Material');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose');

// CREATE (manual)
exports.createMaterial = async (data) => {
  return await Material.create(data);
};

// GET ALL (admin)
exports.getAllMaterials = async () => {
  const materials = await Material.find().sort({ order: 1 });
  return await enrichMaterials(materials);
};

// GET BY ID
exports.getMaterialById = async (id) => {
  const material = await Material.findById(id);
  if (!material) return null;
  const enriched = await enrichMaterials([material]);
  return enriched[0];
};

// UPDATE
exports.updateMaterial = async (id, data) => {
  return await Material.findByIdAndUpdate(id, data, { new: true });
};

// DELETE
exports.deleteMaterial = async (id) => {
  return await Material.findByIdAndDelete(id);
};

// UNTUK GURU (materi yang diupload)
exports.getMaterialsByTeacher = async (teacherId) => {
  const materials = await Material.find({ uploaded_by: teacherId }).sort({ order: 1 });
  return await enrichMaterials(materials);
};

// UNTUK SISWA (materi berdasarkan kelas siswa)
exports.getMaterialsForStudent = async (classId, subjectId = null) => {
  if (!classId) return [];

  const filter = {
    class_id: new mongoose.Types.ObjectId(classId.toString()),
  };
  if (subjectId) {
    filter.subject_id = new mongoose.Types.ObjectId(subjectId.toString());
  }

  const materials = await Material.find(filter).sort({ order: 1 });
  return await enrichMaterials(materials);
};

// GENERATE DENGAN AI (Gemini)
exports.generateMaterialAI = async (data) => {
  const { prompt, titleSuggestion, class_id, subject_id, uploaded_by } = data;
  if (!prompt) throw new Error('Prompt tidak boleh kosong');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = `Anda adalah asisten guru pembuat materi pembelajaran. 
Buat materi berdasarkan permintaan berikut. Output harus dalam format JSON dengan struktur:
{
  "title": "Judul materi",
  "description": "Deskripsi singkat 1-2 kalimat",
  "content": "Isi materi lengkap dalam HTML (paragraf, poin, subjudul)"
}
Jangan tambahkan teks lain di luar JSON.`;

  const fullPrompt = `${systemPrompt}\n\nPermintaan: ${prompt}\n${titleSuggestion ? `Judul yang diinginkan: ${titleSuggestion}` : ''}`;

  const result = await model.generateContent(fullPrompt);
  let jsonString = result.response.text();
  jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const aiContent = JSON.parse(jsonString);

  const material = await Material.create({
    title: aiContent.title,
    description: aiContent.description,
    content: aiContent.content,
    class_id,
    subject_id,
    uploaded_by,
    source_type: 'ai',
    ai_prompt: prompt,
    is_published: true
  });
  return material;
};

// GENERATE QUIZ DENGAN AI (Gemini)
exports.generateQuizQuestionAI = async (data) => {
  const { subject_name } = data;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

exports.generateQuizQuestionAI = async ({ subject_name }) => {
  try {
    if (genAI && process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const systemPrompt = `Anda adalah asisten guru SMP. Buatlah 3 soal kuis singkat tentang mata pelajaran ${subject_name} beserta Kunci Jawaban.
Format output JSON array:
[
  {
    "question": "Pertanyaan kuis...",
    "answer": "Kunci jawaban dan pembahasan singkat..."
  }
]
HANYA kembalikan JSON array valid tanpa markdown fence.`;

      const result = await model.generateContent(systemPrompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error generating AI quiz questions:', err);
  }

  // Fallback if Gemini key unavailable or error occurs
  return [
    {
      question: `Jelaskan fungsi dan contoh penerapan utama dari materi ${subject_name || 'Umum'}!`,
      answer: `Fungsi utama dari ${subject_name || 'materi ini'} adalah untuk memahami konsep dasar dan memecahkan soal latihan.`
    },
    {
      question: `Sebutkan 3 karakteristik penting yang terdapat dalam bahasan ${subject_name || 'Pelajaran'}!`,
      answer: `Tiga karakteristik utama meliputi struktur dasar, prinsip kerja, dan contoh kasus dalam kehidupan sehari-hari.`
    }
  ];
};

// ENRICHMENT: ambil nama kelas, mapel, guru
async function enrichMaterials(materials) {
  if (!materials.length) return [];

  const classIds = [...new Set(materials.map(m => m.class_id?.toString()).filter(Boolean))];
  const subjectIds = [...new Set(materials.map(m => m.subject_id?.toString()).filter(Boolean))];
  const teacherIds = [...new Set(materials.map(m => m.uploaded_by?.toString()).filter(Boolean))];

  const classCol = mongoose.connection.collection('classes');
  const subjectCol = mongoose.connection.collection('subjects');
  const guruCol = mongoose.connection.collection('users_guru');

  const classes = classIds.length ? await classCol.find({ _id: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];
  const subjects = subjectIds.length ? await subjectCol.find({ _id: { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];
  const teachers = teacherIds.length ? await guruCol.find({ _id: { $in: teacherIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];

  const classMap = Object.fromEntries(classes.map(c => [c._id.toString(), c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s._id.toString(), s.name]));
  const teacherMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.full_name]));

  return materials.map(m => ({
    ...m.toObject(),
    class_name: classMap[m.class_id?.toString()] || 'Tidak diketahui',
    subject_name: subjectMap[m.subject_id?.toString()] || 'Tidak diketahui',
    teacher_name: teacherMap[m.uploaded_by?.toString()] || 'Tidak diketahui'
  }));
}