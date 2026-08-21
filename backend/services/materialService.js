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

exports.getMaterialsForStudent = async (classId, subjectId = null) => {
  if (!classId) return [];

  let classIdStr = classId.toString();
  let classIdObj;
  try {
    classIdObj = new mongoose.Types.ObjectId(classIdStr);
  } catch (e) {
    classIdObj = classId;
  }

  const filter = {
    $or: [
      { class_id: classIdStr },
      { class_id: classIdObj },
      { class: classIdStr },
      { class: classIdObj }
    ]
  };

  if (subjectId) {
    let subIdStr = subjectId.toString();
    let subIdObj;
    try { subIdObj = new mongoose.Types.ObjectId(subIdStr); } catch (e) { subIdObj = subjectId; }
    filter.$or.push(
      { subject_id: subIdStr },
      { subject_id: subIdObj },
      { subject: subIdStr },
      { subject: subIdObj }
    );
  }

  const materials = await Material.find(filter).sort({ order: 1 });
  return await enrichMaterials(materials);
};

// GENERATE KONTEN MATERI DENGAN AI (Multi-Slide Rich Paragraph Generator)
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
<h3>Pengantar Topik: ${targetTitle}</h3>
<p>Dalam era digital yang terus berkembang, pemahaman mengenai <strong>${targetTitle}</strong> dalam bidang <strong>${targetSubject}</strong> menjadi pengetahuan dasar yang penting. Teknologi dan bahasa pemrograman terus menjadi fondasi utama dalam menciptakan solusi otomatis bagi berbagai persoalan sehari-hari.</p>
<p>Melalui pembahasan awal ini, kita akan membangun kerangka berpikir yang sistematis. Pemahaman logika yang kuat akan memudahkan kita memecahkan masalah kompleks menjadi bagian-bagian kecil yang lebih mudah dikelola.</p>
</div>`;

    slide2 = `<div class="material-slide">
<h3>Konsep Dasar dan Teori</h3>
<p>Untuk mendalami materi ini, kita perlu memahami komponen-komponen utamanya. Setiap bahasa dan konsep pemrograman memiliki struktur dasar yang berfungsi untuk menyimpan dan mengolah data, mulai dari nilai teks hingga angka yang kompleks.</p>
<p>Selain penyimpanan data, kita juga mengenal mekanisme untuk mengatur alur program. Dengan menggunakan logika kontrol seperti percabangan dan perulangan, sebuah program dapat menentukan langkah apa yang harus diambil berdasarkan kondisi tertentu.</p>
</div>`;

    slide3 = `<div class="material-slide">
<h3>Ilustrasi dan Contoh Penerapan</h3>
<p>Memahami teori saja tidak cukup tanpa melihat implementasinya secara langsung. Penerapan struktur kode yang baik akan menghasilkan program yang efisien dan mudah dibaca oleh pengembang lain.</p>
<p>Perhatikan bagaimana elemen-elemen instruksi digabungkan untuk membentuk sebuah fungsi yang utuh. Setiap baris instruksi memiliki peran penting dalam memastikan keluaran program sesuai dengan yang diharapkan.</p>
</div>`;

    slide4 = `<div class="material-slide">
<h3>Studi Kasus di Dunia Nyata</h3>
<p>Penerapan materi ini sangat luas di dunia industri. Mulai dari pengembangan aplikasi skala kecil hingga sistem enterprise besar, prinsip-prinsip yang sama tetap digunakan sebagai fondasi penyelesaian masalah.</p>
<p>Sistem web, aplikasi mobile, hingga pengolahan data kecerdasan buatan semuanya berakar pada pemahaman fundamental yang sedang kita pelajari ini.</p>
</div>`;

    slide5 = `<div class="material-slide">
<h3>Rangkuman dan Diskusi</h3>
<p>Secara garis besar, kita telah membahas teori awal hingga bagaimana hal ini diterapkan di lapangan. Penguasaan atas konsep ini adalah kunci untuk menjadi pengembang yang handal.</p>
<p>Sebagai bahan refleksi, pikirkan bagaimana Anda dapat mengimplementasikan konsep ini dalam sebuah proyek sederhana yang bisa Anda buat sendiri di rumah.</p>
</div>`;
  } else {
    slide1 = `<div class="material-slide">
<h3>Pengantar Topik: ${targetTitle}</h3>
<p>Selamat datang pada pembahasan materi <strong>${targetTitle}</strong>. Pada bab ini, kita akan menggali lebih dalam berbagai konsep esensial yang berkaitan dengan <strong>${targetSubject}</strong>.</p>
<p>Tujuan utama dari materi ini adalah memberikan wawasan baru dan memperluas perspektif Anda terhadap topik yang sedang dibahas, sehingga Anda mampu menghubungkannya dengan kondisi di dunia nyata.</p>
</div>`;

    slide2 = `<div class="material-slide">
<h3>Uraian Konsep Utama</h3>
<p>Setiap topik pasti memiliki teori dasar yang menopangnya. Di bagian ini, kita akan menguraikan pilar-pilar penting yang menjadi karakteristik utama dari topik bahasan kita.</p>
<p>Memahami teori dasar akan sangat membantu dalam menganalisis masalah yang lebih kompleks di kemudian hari. Pastikan Anda menguasai istilah-istilah kuncinya.</p>
</div>`;

    slide3 = `<div class="material-slide">
<h3>Analisis Kasus Terkait</h3>
<p>Mari kita lihat bagaimana konsep ini terjadi atau diterapkan di sekitar kita. Melalui pengamatan terhadap fenomena atau masalah tertentu, teori yang terkesan abstrak bisa menjadi jauh lebih masuk akal.</p>
<p>Dengan melakukan analisis pada contoh kasus, proses belajar menjadi jauh lebih aplikatif dan tidak sekadar menghafal teori semata.</p>
</div>`;

    slide4 = `<div class="material-slide">
<h3>Dampak dan Implikasi</h3>
<p>Pengetahuan yang kita peroleh hari ini tentu memiliki kegunaan di masa depan. Memahami topik ini akan meningkatkan daya nalar dan kemampuan berpikir kritis Anda dalam merespons informasi baru.</p>
<p>Relevansi materi ini sangat kuat, baik untuk jenjang pendidikan selanjutnya maupun untuk membekali Anda dalam dunia profesional nantinya.</p>
</div>`;

    slide5 = `<div class="material-slide">
<h3>Rangkuman Evaluasi</h3>
<p>Sebagai penutup bab, cobalah rangkum kembali apa saja yang telah Anda pelajari hari ini menggunakan pemahaman bahasa Anda sendiri.</p>
<p>Luangkan waktu sejenak untuk memikirkan satu pertanyaan atau hal yang masih belum Anda pahami sepenuhnya untuk didiskusikan pada pertemuan berikutnya.</p>
</div>`;
  }

  const slideCount = parseInt(data.slide_count) || 5;

  const preGeneratedSlides = [slide1, slide2, slide3, slide4, slide5];
  const fallbackSlides = [];
  for (let i = 1; i <= slideCount; i++) {
    let slideBody = '';
    let slideTitle = `Slide ${i}: Uraian Materi Bagian ${i}`;
    
    if (i <= 5 && preGeneratedSlides[i-1]) {
      slideBody = preGeneratedSlides[i-1];
      // Extract title from <h3> if exists
      const titleMatch = slideBody.match(/<h3[^>]*>(.*?)<\/h3>/i);
      if (titleMatch) {
        slideTitle = titleMatch[1].replace(/<[^>]*>?/gm, '');
      }
    } else {
      slideBody = `<div class="material-slide">
<h3>Slide ${i}: Uraian Lanjutan</h3>
<p>Ini adalah bagian ke-${i} dari materi pembelajaran <strong>${targetTitle}</strong> untuk mata pelajaran <strong>${targetSubject}</strong>.</p>
<p>Siswa diharapkan untuk terus menggali lebih dalam mengenai topik ini melalui referensi tambahan dan diskusi kelompok.</p>
</div>`;
    }
    
    fallbackSlides.push({
      title: slideTitle,
      body: slideBody
    });
  }
  const fallbackContent = fallbackSlides.map(s => s.body).join('\n<!-- slide-break -->\n');

  const defaultRichFallback = {
    title: targetTitle,
    description: description || `Materi pembelajaran komprehensif mengenai bahasan pokok ${targetTitle} untuk mata pelajaran ${targetSubject}.`,
    content: fallbackContent,
    slides: fallbackSlides,
    slide_count: slideCount
  };

  const Setting = require('../models/Setting');
  const settingDoc = await Setting.findOne();
  const dbApiKey = settingDoc?.gemini_api_key || '';
  const apiKey = dbApiKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return defaultRichFallback;
  }

  const modelCandidates = ["gemini-3.6-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

const systemPrompt = `Anda adalah penyusun kurikulum sekolah yang ahli.
Buatlah materi pembelajaran berbentuk ${slideCount} SLIDE PRESENTASI.

ATURAN WAJIB (JIKA DILANGGAR AKAN GAGAL):
1. Setiap slide HARUS berisi penjelasan SANGAT MENDALAM dan PANJANG. 
2. WAJIB TULIS MINIMAL 3 PARAGRAF PANJANG (TOTAL MINIMAL 150 KATA) UNTUK SETIAP SLIDE. Jangan berikan poin-poin singkat! Tulis narasi dan uraian yang komprehensif.
3. Jangan menggunakan format judul seperti "Slide 1: Pengenalan - [Judul Topik]". Tulis judul slide dengan natural, misalnya: "Pengenalan dan Latar Belakang Topik", "Konsep Dasar", dsb.
4. Gunakan pemisah persis <!-- slide-break --> antar slide.
5. Jangan gunakan gambar atau tag <img>.

Format output WAJIB JSON murni (tanpa markdown fence \`\`\`json):
{
  "title": "${targetTitle}",
  "description": "Deskripsi ringkas 1-2 kalimat mengenai inti dari materi ini.",
  "content": "<div class=\\"material-slide\\"><h3>Pengantar Topik</h3><p>Paragraf 1 yang sangat panjang dan informatif...</p><p>Paragraf 2 yang sangat panjang dan informatif...</p><p>Paragraf 3 yang mendalam...</p></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Konsep Utama</h3><p>Paragraf 1 yang sangat panjang...</p><p>Paragraf 2 yang sangat panjang...</p><p>Paragraf 3...</p></div>"
}`;

  const actualPrompt = prompt || `Buat materi pembelajaran sekolah ${slideCount} slide berisi paragraf panjang terlengkap mengenai topik "${targetTitle}". ${description ? `Konteks guru: ${description}` : ''}`;
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

    let cleanedText = rawText;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    let aiContent = null;
    try {
      aiContent = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse Gemini raw JSON:', e.message, 'Cleaned text was:', cleanedText);
    }

     if (aiContent && aiContent.content) {
      // Parse content menjadi slides
      const slides = exports.parseContentToSlides(aiContent.content);
      
      return {
        title: aiContent.title || targetTitle,
        description: aiContent.description || defaultRichFallback.description,
        content: aiContent.content || defaultRichFallback.content,
        slides: slides,  // ← TAMBAHKAN INI
        slide_count: slides.length
      };
    }
  } catch (err) {
    console.error('[Gemini AI Material Gen Error]:', err.message);
    return defaultRichFallback;
  }

  return defaultRichFallback;

};

// Parse content menjadi array slides
exports.parseContentToSlides = (contentHtml) => {
  if (!contentHtml) {
    return [{ title: 'Slide 1', body: '<p>Tuliskan isi materi slide di sini...</p>' }];
  }
  
  // Coba split berdasarkan <!-- slide-break -->
  let slideBlocks = contentHtml.split(/<!--\s*slide-break\s*-->/i)
    .map(s => s.trim())
    .filter(Boolean);
  
  // Jika tidak ada slide-break, coba cari .material-slide
  if (slideBlocks.length <= 1) {
    const matchSlideDivs = contentHtml.match(/<div[^>]*class="material-slide"[^>]*>[\s\S]*?<\/div>/gi);
    if (matchSlideDivs && matchSlideDivs.length > 1) {
      slideBlocks = matchSlideDivs;
    }
  }
  
  // Jika masih hanya 1, coba cari .ppt-slide
  if (slideBlocks.length <= 1) {
    const matchPptSlides = contentHtml.match(/<div[^>]*class="ppt-slide"[^>]*>[\s\S]*?<\/div>/gi);
    if (matchPptSlides && matchPptSlides.length > 1) {
      slideBlocks = matchPptSlides;
    }
  }
  
  // Jika masih 1 atau 0, buat 1 slide dari semua konten
  if (slideBlocks.length <= 1) {
    return [{ title: 'Slide 1', body: contentHtml }];
  }
  
  // Parse setiap slide
  return slideBlocks.map((block, idx) => {
    // Cari judul dari <h3> atau <h2>
    let title = `Slide ${idx + 1}`;
    const titleMatch = block.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    return { title, body: block };
  });
};

// Compile slides menjadi content HTML
exports.compileSlidesToContent = (slides) => {
  if (!slides || !Array.isArray(slides) || slides.length === 0) {
    return '<p>Konten kosong</p>';
  }
  
  return slides.map((slide, idx) => {
    const title = slide.title || `Slide ${idx + 1}`;
    const body = slide.body || '<p>Konten slide kosong</p>';
    
    return `<div class="material-slide" data-slide="${idx + 1}">
<h3>${title}</h3>
${body}
</div>`;
  }).join('\n<!-- slide-break -->\n');
};

// GENERATE QUIZ DENGAN AI (Gemini)
exports.generateQuizQuestionAI = async (data) => {
  const subjectName = (typeof data === 'object' ? data.subject_name || data.subject : data) || 'Informatika';
  const Setting = require('../models/Setting');
  const settingDoc = await Setting.findOne();
  const dbApiKey = settingDoc?.gemini_api_key || '';
  const apiKey = dbApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
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

  const validObjId = (id) => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && id.length === 24;

  const classIds = [...new Set(materials.map(m => m.class_id?.toString()).filter(validObjId))];
  const subjectIds = [...new Set(materials.map(m => m.subject_id?.toString()).filter(validObjId))];
  const teacherIds = [...new Set(materials.map(m => m.uploaded_by?.toString()).filter(validObjId))];

  const classCol = mongoose.connection.collection('classes');
  const subjectCol = mongoose.connection.collection('subjects');
  const guruCol = mongoose.connection.collection('users_guru');

  const classes = classIds.length ? await classCol.find({ _id: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];
  const subjects = subjectIds.length ? await subjectCol.find({ _id: { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];
  const teachers = teacherIds.length ? await guruCol.find({ _id: { $in: teacherIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];

  const classMap = Object.fromEntries(classes.map(c => [c._id.toString(), c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s._id.toString(), s.name]));
  const teacherMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.full_name]));

  return materials.map(m => {
    const obj = m.toObject ? m.toObject() : m;
    const cIdStr = obj.class_id?.toString() || '';
    const sIdStr = obj.subject_id?.toString() || '';
    const uIdStr = obj.uploaded_by?.toString() || '';

    return {
      ...obj,
      class_name: obj.class_name || classMap[cIdStr] || (cIdStr && cIdStr.length < 24 ? cIdStr : 'Bank Materi'),
      subject_name: obj.subject_name || subjectMap[sIdStr] || 'Mata Pelajaran',
      teacher_name: obj.teacher_name || teacherMap[uIdStr] || 'Guru'
    };
  });
}