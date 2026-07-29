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
  if (!teacherId) return [];
  let teacherObjId;
  try {
    teacherObjId = new mongoose.Types.ObjectId(teacherId.toString());
  } catch (e) {
    teacherObjId = teacherId;
  }

  const materials = await Material.find({
    $or: [
      { uploaded_by: teacherId.toString() },
      ...(teacherObjId ? [{ uploaded_by: teacherObjId }] : [])
    ]
  }).sort({ createdAt: -1 });

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

// GENERATE KONTEN MATERI DENGAN AI (Gemini Auto-Prompting)
exports.generateMaterialAI = async (data) => {
  const { title, prompt, subject_name, class_name, description } = data;

  const targetTitle = title || 'Materi Pembelajaran';
  const targetSubject = subject_name || 'Informatika';
  const targetClass = class_name || 'SMP';

  const actualPrompt = prompt || `Buat materi pembelajaran lengkap mengenai topik "${targetTitle}" untuk mata pelajaran "${targetSubject}" tingkat kelas "${targetClass}". ${description ? `Konteks tambahan: ${description}` : ''}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fallback if no Gemini key configured
    return {
      title: targetTitle,
      description: description || `Ringkasan materi pembelajaran mengenai ${targetTitle} pada mata pelajaran ${targetSubject}.`,
      content: `<h3>Ringkasan Pembelajaran: ${targetTitle}</h3><p>Materi ini menyajikan pemahaman dasar, pembahasan teori utama, serta contoh penerapan praktis untuk mata pelajaran <strong>${targetSubject}</strong>.</p><ul><li>Konsep & Pengertian Utama</li><li>Penjelasan Langkah demi Langkah</li><li>Contoh Latihan Mandiri</li></ul>`
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `Anda adalah asisten AI pendidik profesional. 
Buatlah materi pembelajaran sekolah yang terstruktur, jelas, dan menarik.
Format output JSON murni dengan struktur:
{
  "title": "${targetTitle}",
  "description": "Deskripsi/ringkasan singkat 1-2 kalimat mengenai materi ini",
  "content": "Isi materi lengkap dalam HTML terstruktur (menggunakan <p>, <h3>, <ul>, <li>, <strong>, dan contoh soal/latihan)"
}
Jangan tambahkan teks markdown fence di luar JSON murni.`;

    const fullPrompt = `${systemPrompt}\n\nInstruksi Pembelajaran: ${actualPrompt}`;

    const result = await model.generateContent(fullPrompt);
    let jsonString = result.response.text().trim();
    jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();
    const aiContent = JSON.parse(jsonString);

    return {
      title: aiContent.title || targetTitle,
      description: aiContent.description || description || `Materi mengenai ${targetTitle}.`,
      content: aiContent.content || `<p>Isi materi mengenai ${targetTitle}.</p>`
    };
  } catch (err) {
    console.error('[Gemini AI Material Error]:', err);
    return {
      title: targetTitle,
      description: description || `Ringkasan materi pembelajaran mengenai ${targetTitle}.`,
      content: `<h3>Materi: ${targetTitle}</h3><p>Materi pembelajaran mengenai <strong>${targetTitle}</strong> untuk kelas ${targetClass}.</p><ul><li>Pembahasan Konsep Utama</li><li>Studi Kasus & Contoh Penerapan</li></ul>`
    };
  }
};

// GENERATE QUIZ DENGAN AI (Gemini)
exports.generateQuizQuestionAI = async (data) => {
  const subjectName = (typeof data === 'object' ? data.subject_name || data.subject : data) || 'Informatika';
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const systemPrompt = `Anda adalah asisten guru SMP N 1 Suradadi. Buatlah 3 soal kuis singkat khas untuk mata pelajaran "${subjectName}" beserta Kunci Jawaban & Pembahasannya.
Format output JSON array murni:
[
  {
    "question": "Pertanyaan kuis khas mata pelajaran ${subjectName}...",
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
    } catch (err) {
      console.error('Error generating AI quiz questions:', err);
    }
  }

  // Fallback tailored specifically to the requested subject
  return [
    {
      question: `Jelaskan prinsip dasar dan konsep utama yang dipelajari pada mata pelajaran ${subjectName}!`,
      answer: `Prinsip dasar pada ${subjectName} mencakup pemahaman istilah utama, struktur materi, dan penerapan praktisnya.`
    },
    {
      question: `Sebutkan 3 contoh topik utama dan penerapannya dalam materi ${subjectName}!`,
      answer: `Tiga topik utama meliputi teori dasar, studi kasus, serta pengaplikasian pada soal latihan ${subjectName}.`
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
    class_name: classMap[m.class_id?.toString()] || 'Bank Materi',
    subject_name: subjectMap[m.subject_id?.toString()] || 'Mata Pelajaran',
    teacher_name: teacherMap[m.uploaded_by?.toString()] || 'Guru'
  }));
}