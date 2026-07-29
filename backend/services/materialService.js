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

// GENERATE KONTEN MATERI DENGAN AI (Multi-Slide Interactive Presentation Generator)
exports.generateMaterialAI = async (data) => {
  const { title, prompt, subject_name, class_name, description } = data;

  const targetTitle = title || 'Materi Pembelajaran';
  const targetSubject = subject_name || 'Informatika';
  const targetClass = class_name || 'SMP';

  const isProgramming = /pemrograman|coding|algoritma|variabel|python|javascript|html|css|pascal|c\+\+|java|database|basis data|jaringan/i.test(`${targetTitle} ${targetSubject}`);

  let slide1 = '';
  let slide2 = '';
  let slide3 = '';
  let slide4 = '';
  let slide5 = '';

  if (isProgramming) {
    slide1 = `<div class="material-slide">
<h3>Slide 1: Pengenalan Pembelajaran — ${targetTitle}</h3>
<p>Materi ini merupakan bagian penting dalam mata pelajaran <strong>${targetSubject}</strong> tingkat kelas <strong>${targetClass}</strong>.</p>
<p>Tujuan utama dari mempelajari <strong>${targetTitle}</strong> adalah agar siswa dapat memahami instruksi logis komputer, merancang alur algoritma, dan mengasah pola berpikir komputasional (computational thinking).</p>
</div>`;

    slide2 = `<div class="material-slide">
<h3>Slide 2: Konsep Utama & Struktur Sintaksis</h3>
<p>Dalam <strong>${targetTitle}</strong>, terdapat beberapa elemen penting yang membangun sebuah program:</p>
<ul>
  <li><strong>Variabel & Tipe Data:</strong> Wadah untuk menyimpan informasi (angka, teks, boolean).</li>
  <li><strong>Struktur Logika (Control Flow):</strong> Pengambilan keputusan menggunakan perintah <code>IF...ELSE</code> dan perulangan (Looping).</li>
  <li><strong>Fungsi & Prosedur:</strong> Blok kode yang dapat digunakan kembali secara modular.</li>
</ul>
</div>`;

    slide3 = `<div class="material-slide">
<h3>Slide 3: Contoh Sintaksis & Kode Program Riil</h3>
<p>Berikut adalah ilustrasi kode program sederhana untuk menerapkan konsep <strong>${targetTitle}</strong>:</p>
<pre style="background:#1e293b; color:#f8fafc; padding:16px; border-radius:12px; font-family:monospace; font-size:13px; line-height:1.6; border:1px solid #334155;">
// Implementasi Kode Program ${targetTitle}
let namaMateri = "${targetTitle}";
let statusTuntas = true;

if (statusTuntas) {
    console.log("Siswa berhasil memahami konsep: " + namaMateri);
} else {
    console.log("Silakan pelajari kembali modul: " + namaMateri);
}
</pre>
</div>`;

    slide4 = `<div class="material-slide">
<h3>Slide 4: Penerapan Praktis & Case Study</h3>
<p>Konsep <strong>${targetTitle}</strong> digunakan luas dalam pengembangan teknologi industri saat ini:</p>
<ul>
  <li>Pembuatan aplikasi berbasis Web dan Mobile.</li>
  <li>Pengembangan sistem kecerdasan buatan (AI) dan otomatisasi.</li>
  <li>Pengolahan data dan keamanan informasi.</li>
</ul>
</div>`;

    slide5 = `<div class="material-slide">
<h3>Slide 5: Rangkuman & Latihan Mandiri Siswa</h3>
<p>Cobalah untuk mendiskusikan dan menjawab 2 pertanyaan berikut:</p>
<ol>
  <li>Jelaskan apa fungsi utama dari <strong>${targetTitle}</strong> dalam pemrograman!</li>
  <li>Tuliskan langkah-langkah logika (pseudocode) sederhana yang memanfaatkan konsep ${targetTitle}!</li>
</ol>
</div>`;
  } else {
    slide1 = `<div class="material-slide">
<h3>Slide 1: Pengenalan Pembelajaran — ${targetTitle}</h3>
<p>Selamat datang pada pembahasan materi <strong>${targetTitle}</strong> untuk mata pelajaran <strong>${targetSubject}</strong> kelas <strong>${targetClass}</strong>.</p>
<p>Bab ini membahas mengenai dasar-dasar, konsep penting, dan relevansi topik ini dalam pembelajaran sekolah.</p>
</div>`;

    slide2 = `<div class="material-slide">
<h3>Slide 2: Konsep Utama & Teori dasar</h3>
<p>Berikut adalah poin-poin utama yang harus dikuasai pada materi <strong>${targetTitle}</strong>:</p>
<ul>
  <li><strong>Pengertian Utama:</strong> Pemahaman menyeluruh mengenai definisi dan latar belakang ${targetTitle}.</li>
  <li><strong>Karakteristik Pembentuk:</strong> Ciri-ciri utama yang membedakan topik ini.</li>
</ul>
</div>`;

    slide3 = `<div class="material-slide">
<h3>Slide 3: Pembahasan Uraian & Contoh Kasus</h3>
<p>Uraian lengkap mengenai <strong>${targetTitle}</strong> beserta contoh penerapannya dalam kehidupan nyata.</p>
<div style="background:#f8fafc; border-left:4px solid #0284c7; padding:14px; margin-top:10px; border-radius:8px;">
  <strong>Contoh Kasus:</strong> Penjelasan skenario praktis dari materi ${targetTitle}.
</div>
</div>`;

    slide4 = `<div class="material-slide">
<h3>Slide 4: Manfaat & Dampak Pembelajaran</h3>
<p>Dengan menguasai <strong>${targetTitle}</strong>, siswa dapat mengasah keterampilan analitis, daya nalar kritis, serta pemecahan masalah.</p>
</div>`;

    slide5 = `<div class="material-slide">
<h3>Slide 5: Rangkuman & Evaluasi Mandiri</h3>
<ol>
  <li>Sebutkan 2 poin paling penting dari pembahasan <strong>${targetTitle}</strong>!</li>
  <li>Jelaskan bagaimana kamu menerapkan materi ini dalam kegiatan belajar sehari-hari!</li>
</ol>
</div>`;
  }

  const fallbackContent = [slide1, slide2, slide3, slide4, slide5].join('\n<!-- slide-break -->\n');

  const defaultRichFallback = {
    title: targetTitle,
    description: description || `Materi pembelajaran slide interaktif mengenai ${targetTitle} untuk mata pelajaran ${targetSubject} kelas ${targetClass}.`,
    content: fallbackContent
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return defaultRichFallback;
  }

  // List of Gemini AI model variants to attempt sequentially
  const modelCandidates = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash"];

  const systemPrompt = `Anda adalah seorang penyusun kurikulum dan guru ahli profesional Indonesia.
Buatlah materi pembelajaran sekolah berbentuk 5 SLIDE PRESENTASI INTERAKTIF yang SANGAT DETAIL dan BERKUALITAS TINGGI untuk topik "${targetTitle}" mata pelajaran "${targetSubject}" kelas "${targetClass}".
PENTING: Pisahkan antar slide menggunakan pemisah persis: <!-- slide-break -->
Format output JSON murni tanpa markdown codeblock fence:
{
  "title": "${targetTitle}",
  "description": "Deskripsi/ringkasan singkat 1-2 kalimat mengenai materi slide ini",
  "content": "<div class=\\"material-slide\\"><h3>Slide 1: ...</h3><p>...</p></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Slide 2: ...</h3><p>...</p></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Slide 3: ...</h3><p>...</p></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Slide 4: ...</h3><p>...</p></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Slide 5: ...</h3><p>...</p></div>"
}`;

  const actualPrompt = prompt || `Buat materi pembelajaran sekolah 5 slide terlengkap mengenai topik "${targetTitle}". ${description ? `Konteks guru: ${description}` : ''}`;
  const fullPrompt = `${systemPrompt}\n\nTopik Pembelajaran: ${actualPrompt}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let rawText = '';

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