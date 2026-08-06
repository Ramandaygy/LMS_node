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
<h3>Slide 1: Pengenalan Pembelajaran & Latar Belakang — ${targetTitle}</h3>
<p>Dalam era transformasi digital yang berkembang pesat, pemahaman mengenai <strong>${targetTitle}</strong> pada mata pelajaran <strong>${targetSubject}</strong> menjadi pengetahuan fondasi yang sangat vital bagi siswa kelas <strong>${targetClass}</strong>. Bahasa pemrograman merupakan sarana utama bagi manusia untuk memberikan instruksi yang presisi dan sistematis kepada perangkat komputer agar dapat menyelesaikan berbagai persoalan kompleks secara otomatis.</p>
<p>Melalui pembelajaran bab ini, siswa tidak hanya diajarkan menuliskan kode, melainkan dilatih untuk membangun pola berpikir komputasional (computational thinking). Pola pikir ini mencakup kemampuan dekomposisi masalah, pengenalan pola, abstraksi, dan perancangan algoritma efisien yang dapat diterapkan dalam kehidupan sehari-hari maupun pengembangan perangkat lunak modern.</p>
</div>`;

    slide2 = `<div class="material-slide">
<h3>Slide 2: Konsep Utama & Teori Dasar Sintaksis</h3>
<p>Untuk memahami <strong>${targetTitle}</strong> secara mendalam, terdapat beberapa komponen utama dalam arsitektur pemrograman yang harus dikuasai. Pertama adalah <strong>Variabel dan Tipe Data</strong>, yang berfungsi sebagai tempat penyimpanan data di dalam memori komputer, seperti data angka (integer), bilangan desimal (float), karakter teks (string), hingga nilai kebenaran logika (boolean).</p>
<p>Komponen kedua yang sangat krusial adalah <strong>Struktur Kontrol Alur (Control Flow)</strong>. Komputer mengeksekusi perintah berdasarkan aturan logika tertentu seperti percabangan (pernyataan <code>IF...ELSE</code>) untuk mengambil keputusan, serta perulangan (looping <code>FOR</code> atau <code>WHILE</code>) untuk menjalankan tugas yang sama berulang kali secara efisien tanpa perlu menuliskan kode berulang-ulang.</p>
<p>Selain itu, konsep <strong>Fungsi dan Modularitas</strong> memungkinkan pengembang membagi program besar menjadi blok-blok kecil yang independen. Hal ini mempermudah proses perawatan kode (maintenance), pemecahan bug (debugging), dan kolaborasi pengembangan tim.</p>
</div>`;

    slide3 = `<div class="material-slide">
<h3>Slide 3: Contoh Sintaksis & Pembahasan Kode Riil</h3>
<p>Berikut adalah ilustrasi struktur penulisan kode program sederhana yang menerapkan konsep logika dan variabel pada <strong>${targetTitle}</strong>:</p>
<pre style="background:#1e293b; color:#f8fafc; padding:16px; border-radius:12px; font-family:monospace; font-size:13px; line-height:1.6; border:1px solid #334155;">
// Contoh Implementasi Dasar Logika Pemrograman: ${targetTitle}
let namaTopik = "${targetTitle}";
let nilaiKeterampilan = 85;
let batasTuntas = 75;

console.log("Memulai simulasi logika pembelajaran " + namaTopik + "...");

if (nilaiKeterampilan >= batasTuntas) {
    console.log("Status: Selamat, siswa berhasil menguasai konsep dasar " + namaTopik + " dengan nilai " + nilaiKeterampilan);
} else {
    console.log("Status: Siswa disarankan membaca kembali uraian materi pada " + namaTopik);
}
</pre>
<p>Pada blok kode di atas, variabel <code>namaTopik</code> menyimpan string judul materi, sedangkan <code>nilaiKeterampilan</code> menyimpan nilai numerik. Pernyataan percabangan <code>IF</code> akan mengevaluasi apakah nilai tersebut memenuhi batas tuntas, lalu mengeksekusi pesan yang sesuai ke layar konsol.</p>
</div>`;

    slide4 = `<div class="material-slide">
<h3>Slide 4: Penerapan Praktis & Case Study Industri</h3>
<p>Penerapan konsep <strong>${targetTitle}</strong> tidak hanya terbatas pada lingkungan kelas, melainkan menjadi pilar utama dalam industri teknologi informasi skala global. Logika pemrograman ini diterapkan pada pembuatan sistem aplikasi berbasis web, pengembangan aplikasi seluler (Android & iOS), hingga pengelolaan basis data skala besar pada perusahaan teknologi mutakhir.</p>
<p>Sebagai contoh kasus, platform media sosial dan layanan e-commerce memanfaatkan alur logika percabangan serta perulangan untuk memproses jutaan transaksi pengguna secara bersamaan, memverifikasi kata sandi akun, serta merekomendasikan konten secara personal menggunakan algoritma cerdas (Artificial Intelligence).</p>
</div>`;

    slide5 = `<div class="material-slide">
<h3>Slide 5: Rangkuman & Evaluasi Mandiri Siswa</h3>
<p>Secara keseluruhan, mempelajari <strong>${targetTitle}</strong> memberikan kemampuan analisis logis dan ketelitian tinggi. Penguasaan atas tipe data, alur keputusan logika, dan struktur modular merupakan kunci utama untuk menjadi pencipta teknologi di masa depan.</p>
<p>Untuk menguji sejauh mana pemahaman Anda pada materi bab ini, jawablah pertanyaan evaluasi mandiri berikut:</p>
<ol>
  <li>Jelaskan dengan bahasa Anda sendiri mengapa penggunaan variabel dan tipe data sangat penting dalam <strong>${targetTitle}</strong>!</li>
  <li>Berikan satu contoh skenario nyata di sekitar Anda (misalnya sistem kasir toko atau lampu lalu lintas) yang menggunakan logika percabangan <code>IF...ELSE</code>!</li>
</ol>
</div>`;
  } else {
    slide1 = `<div class="material-slide">
<h3>Slide 1: Pengenalan Pembelajaran & Latar Belakang — ${targetTitle}</h3>
<p>Selamat datang pada pembahasan materi <strong>${targetTitle}</strong> untuk mata pelajaran <strong>${targetSubject}</strong> tingkat kelas <strong>${targetClass}</strong>. Pembahasan pada bab ini disusun secara komprehensif untuk membimbing siswa memahami prinsip-prinsip mendalam, dasar teori, dan relevansinya dalam kehidupan sehari-hari.</p>
<p>Melalui materi ini, siswa diharapkan tidak hanya menghafal konsep murni, tetapi juga mampu menganalisis hubungan antar komponen, mengidentifikasi permasalahan di lingkungan sekitar, serta mengaplikasikan pengetahuan ini secara kreatif dan kritis.</p>
</div>`;

    slide2 = `<div class="material-slide">
<h3>Slide 2: Konsep Utama & Uraian Teori Mendalam</h3>
<p>Dalam mempelajari <strong>${targetTitle}</strong>, terdapat beberapa fondasi teori utama yang menjadi pilar pemahaman. Fondasi pertama adalah mengenai batasan definisi dan karakteristik dasar yang membedakan topik ini dari materi pembahasan lainnya.</p>
<p>Fondasi kedua mencakup analisis struktur dan mekanisme kerja internal dari <strong>${targetTitle}</strong>. Setiap elemen di dalamnya saling berinteraksi secara sistematis membentuk satu kesatuan fungsi yang utuh. Pemahaman atas interaksi ini penting untuk menyelesaikan berbagai bentuk soal dan aplikasi praktis.</p>
</div>`;

    slide3 = `<div class="material-slide">
<h3>Slide 3: Pembahasan Kasus & Contoh Pengaplikasian</h3>
<p>Berikut adalah uraian skenario analisis mengenai penerapan <strong>${targetTitle}</strong> dalam kehidupan nyata:</p>
<div style="background:#f8fafc; border-left:4px solid #0284c7; padding:16px; margin:12px 0; border-radius:8px;">
  <strong>Studi Kasus Pembelajaran:</strong> Pengamatan terhadap fenomena atau peristiwa yang berkaitan dengan ${targetTitle}.<br/>
  <strong>Analisis Masalah:</strong> Mengapa fenomena tersebut terjadi dan faktor apa saja yang mempengaruhinya.<br/>
  <strong>Kesimpulan Solusi:</strong> Menggunakan pendekatan teori ${targetTitle} untuk memberikan penjelasan matematis/ilmiah yang akurat.
</div>
<p>Melalui contoh kasus di atas, siswa diajak untuk menghubungkan antara teori yang dipelajari di dalam buku dengan fakta lapangan yang dijumpai sehari-hari.</p>
</div>`;

    slide4 = `<div class="material-slide">
<h3>Slide 4: Manfaat, Dampak, & Relevansi Masa Depan</h3>
<p>Penguasaan materi <strong>${targetTitle}</strong> memberikan dampak positif jangka panjang bagi pengembangan kemampuan bernalar siswa. Keterampilan menganalisis data, menarik kesimpulan secara rasional, dan mengevaluasi kebenaran informasi merupakan kecakapan hidup (life skills) yang sangat berharga.</p>
<p>Di masa depan, pengetahuan pada topik ini menjadi bekal penting saat siswa melanjutkan studi ke jenjang yang lebih tinggi maupun saat beradaptasi dengan tantangan dunia kerja modern yang serba dinamis.</p>
</div>`;

    slide5 = `<div class="material-slide">
<h3>Slide 5: Rangkuman & Evaluasi Mandiri Siswa</h3>
<p>Sebagai rangkuman, bab <strong>${targetTitle}</strong> telah membekali Anda dengan konsep dasar, analisis teori, dan contoh pengaplikasian nyata. Keberhasilan dalam menguasai materi ini diukur dari sejauh mana Anda mampu menjelaskan kembali konsep ini dengan bahasa sendiri.</p>
<p>Jawablah soal refleksi mandiri berikut untuk memantapkan pemahaman Anda:</p>
<ol>
  <li>Tuliskan 2 poin paling berharga yang Anda dapatkan dari pembahasan <strong>${targetTitle}</strong>!</li>
  <li>Jelaskan bagaimana konsep ${targetTitle} dapat membantu memecahkan masalah dalam kegiatan belajar Anda!</li>
</ol>
</div>`;
  }

  const fallbackContent = [slide1, slide2, slide3, slide4, slide5].join('\n<!-- slide-break -->\n');

  // Simpan slides array untuk digunakan jika AI gagal
  const fallbackSlides = [
    { title: 'Slide 1: Pengenalan Pembelajaran', body: slide1 },
    { title: 'Slide 2: Konsep Utama', body: slide2 },
    { title: 'Slide 3: Contoh & Pembahasan', body: slide3 },
    { title: 'Slide 4: Penerapan Praktis', body: slide4 },
    { title: 'Slide 5: Rangkuman & Evaluasi', body: slide5 }
  ];

  const defaultRichFallback = {
    title: targetTitle,
    description: description || `Materi pembelajaran slide interaktif paragraf panjang mengenai ${targetTitle} untuk mata pelajaran ${targetSubject} kelas ${targetClass}.`,
    content: fallbackContent,
    slides: fallbackSlides,  // ← TAMBAHKAN INI
    slide_count: 5
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return defaultRichFallback;
  }

  const modelCandidates = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash"];

  const slideCount = parseInt(data.slide_count) || 5;

  const systemPrompt = `Anda adalah seorang penyusun kurikulum dan penulis buku teks sekolah profesional Indonesia yang sangat berpengalaman.
Buatlah materi pembelajaran sekolah berbentuk ${slideCount} SLIDE PRESENTASI INTERAKTIF dengan PENJELASAN PARAGRAF PANJANG LENGKAP, MENDALAM, DAN SANGAT DETAIL (WAJIB berupa paragraf naratif panjang yang mendalam, BUKAN sekadar poin-poin/bullet point singkat).

PETUNJUK KHUSUS PENULISAN:
- Setiap slide WAJIB berisi minimal 2 hingga 3 PARAGRAF PANJANG yang kaya akan uraian materi, penjelasan latar belakang, teori dasar, dan analisis mendalam.
- Jangan hanya memberikan poin singkat 1 kalimat. Tuliskan penjelasan buku teks yang utuh, bernalar, dan informatif.
- Di setiap slide, sisipkan satu tag gambar HTML ilustrasi dengan format: <img src="https://loremflickr.com/600/400/[keyword_gambar_bahasa_inggris]" alt="Ilustrasi" style="width:100%; max-width:550px; height:auto; border-radius:12px; margin: 12px 0; display:block;" /> dengan kata kunci [keyword_gambar_bahasa_inggris] diganti kata kunci topik slide tersebut (dalam bahasa inggris agar gambar akurat).
- Wajib memisahkan antar slide menggunakan pemisah persis: <!-- slide-break -->

Format output JSON murni tanpa markdown codeblock fence:
{
  "title": "${targetTitle}",
  "description": "Deskripsi ringkas 1-2 kalimat mengenai materi slide ini",
  "content": "<div class=\\"material-slide\\"><h3>Slide 1: ...</h3><p>...</p><img src=\\"https://loremflickr.com/600/400/science\\" alt=\\"Ilustrasi\\" style=\\"width:100%; max-width:550px; height:auto; border-radius:12px; margin: 12px 0; display:block;\\" /></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Slide 2: ...</h3><p>...</p></div>"
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

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
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