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

  const actualPrompt = prompt || `Buat materi pembelajaran sekolah yang sangat lengkap, jelas, dan terstruktur mengenai topik "${targetTitle}" untuk mata pelajaran "${targetSubject}" tingkat kelas "${targetClass}". ${description ? `Konteks tambahan dari guru: ${description}` : ''}`;

  const defaultRichFallback = {
    title: targetTitle,
    description: description || `Materi pembelajaran lengkap mengenai ${targetTitle} untuk mata pelajaran ${targetSubject} tingkat ${targetClass}.`,
    content: `<h3>Pengenalan Pembelajaran: ${targetTitle}</h3>
<p>Materi pembelajaran ini membahas mengenai <strong>${targetTitle}</strong> pada mata pelajaran <strong>${targetSubject}</strong> untuk siswa kelas <strong>${targetClass}</strong>.</p>
<h4>1. Tujuan Pembelajaran & Konsep Utama</h4>
<p>Setelah mempelajari materi ini, siswa diharapkan dapat memahami konsep dasar, prinsip utama, dan pengaplikasian dari ${targetTitle}.</p>
<ul>
  <li><strong>Pengertian Utama:</strong> Definisi dasar dan pentingnya mempelajari ${targetTitle}.</li>
  <li><strong>Fungsi & Manfaat:</strong> Penerapan praktis dalam kehidupan sehari-hari dan bidang ${targetSubject}.</li>
  <li><strong>Prinsip Kerja / Teori:</strong> Penjelasan rinci langkah demi langkah.</li>
</ul>
<h4>2. Uraian & Pembahasan Materi</h4>
<p>Topik <strong>${targetTitle}</strong> merupakan salah satu kompetensi dasar utama. Pemahaman yang mendalam pada bab ini menjadi fondasi penting untuk bab-bab selanjutnya.</p>
<h4>3. Rangkuman & Latihan Mandiri</h4>
<p>Cobalah untuk menjawab pertanyaan singkat berikut untuk menguji pemahaman Anda:</p>
<ol>
  <li>Jelaskan apa yang dimaksud dengan ${targetTitle}?</li>
  <li>Sebutkan 2 contoh penerapan ${targetTitle} yang kamu ketahui!</li>
</ol>`
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return defaultRichFallback;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `Anda adalah asisten AI pendidik profesional Indonesia. 
Buatlah materi pembelajaran sekolah yang terstruktur, lengkap, dan menarik.
Wajib me-return output JSON murni dengan format persis:
{
  "title": "${targetTitle}",
  "description": "Ringkasan singkat 1-2 kalimat mengenai materi ini",
  "content": "Isi materi lengkap dalam HTML terstruktur (menggunakan <p>, <h3>, <h4>, <ul>, <li>, <ol>, <strong>, dan contoh latihan)"
}
Jangan menambahkan teks markdown fence di luar JSON.`;

    const fullPrompt = `${systemPrompt}\n\nTopik Pembelajaran: ${actualPrompt}`;

    const result = await model.generateContent(fullPrompt);
    let rawText = result.response.text().trim();

    // Extract JSON object safely using regex
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    const aiContent = JSON.parse(rawText);

    return {
      title: aiContent.title || targetTitle,
      description: aiContent.description || defaultRichFallback.description,
      content: aiContent.content || defaultRichFallback.content
    };
  } catch (err) {
    console.error('[Gemini AI Material Error]:', err.message);
    return defaultRichFallback;
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