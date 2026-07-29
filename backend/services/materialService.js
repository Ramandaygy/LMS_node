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

// GENERATE KONTEN MATERI DENGAN AI (Gemini Auto-Prompting Backend)
exports.generateMaterialAI = async (data) => {
  const { title, prompt, subject_name, class_name, description } = data;

  const targetTitle = title || 'Materi Pembelajaran';
  const targetSubject = subject_name || 'Informatika';
  const targetClass = class_name || 'SMP';

  const isProgramming = /pemrograman|coding|algoritma|variabel|python|javascript|html|css|pascal|c\+\+|java|database|basis data|jaringan/i.test(`${targetTitle} ${targetSubject}`);
  const isMath = /matematika|aljabar|geometri|kalkulus|persamaan|fungsi|trigonometri|statistik/i.test(`${targetTitle} ${targetSubject}`);

  let fallbackContent = '';

  if (isProgramming) {
    fallbackContent = `<h3>Pengenalan Pembelajaran: ${targetTitle}</h3>
<p>Dalam bidang <strong>${targetSubject}</strong>, topik <strong>${targetTitle}</strong> merupakan landasan penting untuk memahami instruksi komputer, struktur logika program, dan pemecahan masalah (computational thinking).</p>

<h4>1. Konsep Utama & Prinsip Dasar</h4>
<p><strong>${targetTitle}</strong> mencakup aturan penulisan kode (sintaksis), penggunaan struktur data, dan eksekusi logika oleh komputer. Komponen utama yang perlu dipahami meliputi:</p>
<ul>
  <li><strong>Variabel & Tipe Data:</strong> Tempat menyimpan nilai seperti angka (integer/float), teks (string), dan nilai kebenaran (boolean).</li>
  <li><strong>Struktur Kontrol Flow:</strong> Percabangan (Logika <code>IF...ELSE</code>) dan Perulangan (Looping <code>FOR/WHILE</code>) untuk mengatur alur program.</li>
  <li><strong>Fungsi / Prosedur:</strong> Blok kode yang dapat dipanggil berulang kali untuk menjalankan tugas tertentu.</li>
</ul>

<h4>2. Contoh Sintaksis & Kode Program Sederhana</h4>
<p>Berikut adalah ilustrasi logika dasar penulisan kode pada <strong>${targetTitle}</strong>:</p>
<pre style="background:#1e293b; color:#f8fafc; padding:14px; border-radius:10px; font-family:monospace; font-size:13px; line-height:1.5;">
// Contoh Implementasi Dasar Logika ${targetTitle}
let namaMateri = "${targetTitle}";
let nilaiKKM = 75;
let nilaiSiswa = 85;

if (nilaiSiswa >= nilaiKKM) {
    console.log("Selamat, Anda tuntas mempelajari " + namaMateri);
} else {
    console.log("Silakan pelajari ulang konsep " + namaMateri);
}
</pre>

<h4>3. Penerapan Praktis & Pemecahan Masalah</h4>
<p>Penerapan ${targetTitle} digunakan dalam pembuatan aplikasi web, perangkat lunak mobile, hingga sistem otomatisasi cerdas. Siswa dilatih untuk berpikir logis dan sistematis.</p>

<h4>4. Soal Latihan & Evaluasi Mandiri</h4>
<ol>
  <li>Jelaskan fungsi utama dari <strong>${targetTitle}</strong> dalam pengembangan program komputer!</li>
  <li>Buatlah urutan langkah (pseudocode) sederhana yang menerapkan konsep ${targetTitle}!</li>
</ol>`;
  } else if (isMath) {
    fallbackContent = `<h3>Pengenalan Pembelajaran: ${targetTitle}</h3>
<p>Topik <strong>${targetTitle}</strong> pada mata pelajaran <strong>${targetSubject}</strong> bertujuan untuk melatih pola pikir kritis, analisis matematis, dan pemecahan masalah bernalar.</p>

<h4>1. Definisi & Rumus Dasar</h4>
<p>Dalam memahami <strong>${targetTitle}</strong>, terdapat beberapa teorema dasar dan rumus penting yang harus dikuasai:</p>
<ul>
  <li><strong>Konsep Dasar:</strong> Penjelasan variabel dan simbol yang digunakan dalam perhitungan.</li>
  <li><strong>Persamaan Utama:</strong> Aturan matematika dasar yang berlaku secara konsisten.</li>
</ul>

<h4>2. Pembahasan Langkah demi Langkah & Contoh Soal</h4>
<p>Berikut adalah contoh penerapan konsep perhitungan pada <strong>${targetTitle}</strong>:</p>
<div style="background:#f8fafc; border-left:4px solid #0284c7; padding:12px 16px; margin:12px 0;">
  <strong>Contoh Kasus:</strong> Diketahui masalah mengenai ${targetTitle}.<br/>
  <strong>Langkah 1:</strong> Identifikasi data yang diketahui dan ditanyakan.<br/>
  <strong>Langkah 2:</strong> Gunakan rumus utama untuk menghitung nilai akhir secara teliti.<br/>
  <strong>Hasil:</strong> Diperoleh nilai solusi yang akurat.
</div>

<h4>3. Rangkuman & Latihan Soal Mandiri</h4>
<ol>
  <li>Sebutkan 2 prinsip utama yang ada pada topik <strong>${targetTitle}</strong>!</li>
  <li>Kerjakan latihan soal mengenai ${targetTitle} dengan mengikuti langkah-langkah di atas!</li>
</ol>`;
  } else {
    fallbackContent = `<h3>Pengenalan Pembelajaran: ${targetTitle}</h3>
<p>Materi <strong>${targetTitle}</strong> pada mata pelajaran <strong>${targetSubject}</strong> dirancang untuk memberikan pemahaman komprehensif, wawasan teori, dan penerapan praktis untuk kelas <strong>${targetClass}</strong>.</p>

<h4>1. Tujuan Pembelajaran & Konsep Utama</h4>
<p>Setelah mempelajari bab ini, siswa diharapkan mampu menguasai konsep <strong>${targetTitle}</strong> secara mendalam.</p>
<ul>
  <li><strong>Pengertian Utama:</strong> Definisi komprehensif dari ${targetTitle} beserta latar belakang topik.</li>
  <li><strong>Karakteristik & Ciri Khusus:</strong> Unsur-unsur penting yang membentuk ${targetTitle}.</li>
  <li><strong>Penerapan Nyata:</strong> Contoh pengaplikasian topik ini dalam kehidupan sehari-hari.</li>
</ul>

<h4>2. Pembahasan Uraian Materi</h4>
<p>Pembahasan pada bab <strong>${targetTitle}</strong> mencakup analisis struktur, analisis fungsi, serta kaitan topik ini dengan mata pelajaran ${targetSubject} secara keseluruhan.</p>

<h4>3. Rangkuman & Soal Evaluasi Siswa</h4>
<ol>
  <li>Jelaskan pengertian dan pentingnya mempelajari <strong>${targetTitle}</strong>!</li>
  <li>Berikan 2 contoh konkret penerapan ${targetTitle} yang kamu temukan di sekitarmu!</li>
</ol>`;
  }

  const defaultRichFallback = {
    title: targetTitle,
    description: description || `Materi pembelajaran lengkap mengenai ${targetTitle} untuk mata pelajaran ${targetSubject} tingkat ${targetClass}.`,
    content: fallbackContent
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return defaultRichFallback;
  }

  // List of Gemini AI model variants to attempt sequentially
  const modelCandidates = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash"];

  const systemPrompt = `Anda adalah seorang penyusun kurikulum dan guru ahli profesional Indonesia.
Buatlah materi pembelajaran sekolah yang SANGAT DETAIL, LENGKAP, dan BERKUALITAS TINGGI untuk topik "${targetTitle}" mata pelajaran "${targetSubject}" kelas "${targetClass}".
Beri penjelasan mendalam (bukan ringkasan prompt/template).
Wajib me-return output JSON murni tanpa markdown codeblock fence:
{
  "title": "${targetTitle}",
  "description": "Deskripsi/ringkasan materi 1-2 kalimat yang menarik",
  "content": "Isi materi lengkap dalam HTML terstruktur (<p>, <h3>, <h4>, <ul>, <li>, <ol>, <strong>, <pre>, <code>) dengan penjelasan materi riil, konsep, contoh, dan soal latihan"
}`;

  const actualPrompt = prompt || `Buat materi pembelajaran sekolah terlengkap mengenai topik "${targetTitle}". ${description ? `Konteks guru: ${description}` : ''}`;
  const fullPrompt = `${systemPrompt}\n\nTopik Pembelajaran: ${actualPrompt}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let rawText = '';

    // Attempt candidates
    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        rawText = result.response.text().trim();
        if (rawText) break;
      } catch (e) {
        console.warn(`[Gemini Model ${modelName} Failed]:`, e.message);
      }
    }

    if (!rawText) {
      return defaultRichFallback;
    }

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
    console.error('[Gemini AI Material Gen Error]:', err.message);
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