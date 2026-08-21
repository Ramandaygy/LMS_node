const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const apiKey = "AIzaSyAnSbYGhneLZMMYRf35so8djbQyVb5DOMc"; // From .env
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const targetTitle = "Pengenalan Javascript";
  const slideCount = 5;
  const systemPrompt = `Anda adalah penyusun kurikulum sekolah yang ahli.
Buatlah materi pembelajaran berbentuk ${slideCount} SLIDE PRESENTASI.

ATURAN WAJIB (JIKA DILANGGAR AKAN GAGAL):
1. Setiap slide berisi teks penjelasan mendalam, BUKAN sekadar poin-poin singkat. Tulis paragraf yang informatif.
2. Jangan menggunakan format judul seperti "Slide 1: Pengenalan - [Judul Topik]". Tulis judul slide dengan natural, misalnya: "Pengenalan dan Latar Belakang Topik", "Konsep Dasar", dsb.
3. Gunakan pemisah persis <!-- slide-break --> antar slide.
4. Jangan gunakan gambar atau tag <img>.

Format output WAJIB JSON murni (tanpa markdown fence \`\`\`json):
{
  "title": "${targetTitle}",
  "description": "Deskripsi ringkas 1-2 kalimat mengenai inti dari materi ini.",
  "content": "<div class=\\"material-slide\\"><h3>Pengantar Topik</h3><p>Penjelasan detail...</p></div><!-- slide-break --><div class=\\"material-slide\\"><h3>Konsep Utama</h3><p>Penjelasan lanjutan...</p></div>"
}`;

  try {
    const result = await model.generateContent(systemPrompt);
    console.log("SUCCESS!");
    console.log(result.response.text());
  } catch (err) {
    console.error("FAILED:", err.message);
  }
}

test();
