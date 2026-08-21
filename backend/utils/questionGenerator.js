// backend/utils/questionGenerator.js

/**
 * Memecah teks menjadi kalimat dan mengekstrak kalimat berformat definisi.
 */
function extractDefinitions(text) {
  // Hapus tag HTML jika teks berasal dari editor rich-text
  const cleanText = text.replace(/<[^>]+>/g, ' ');
  // Hapus karakter khusus dan pisahkan berdasarkan titik/tanda tanya
  const sentences = cleanText.split(/(?<=[.?!])\s+/);
  const definitions = [];

  // Regex tidak perlu di-anchor (dihilangkan ^ dan $) agar bisa menangkap definisi di tengah kalimat
  const regex = /([a-zA-Z0-9\s-]+?)\s+(adalah|merupakan|yaitu|yakni|berfungsi untuk)\s+(.+)/i;

  sentences.forEach(sentence => {
    // Bersihkan kalimat dari newline
    const cleanSentence = sentence.replace(/[\r\n]+/g, ' ').trim();
    if (cleanSentence.length < 20 || cleanSentence.length > 250) return;

    const match = cleanSentence.match(regex);
    if (match) {
      let subject = match[1].trim();
      // Bersihkan kata depan dari subject
      subject = subject.replace(/^(dan|tetapi|sedangkan|sementara itu|jadi|maka|bahwa)\s+/i, '');
      
      const keyword = match[2].trim();
      const definition = match[3].trim().replace(/\.$/, '');
      
      // Filter subjek yang terlalu panjang (bukan kata benda yang bagus)
      if (subject.split(' ').length <= 5) {
        definitions.push({ subject, keyword, definition, original: cleanSentence });
      }
    }
  });

  return definitions;
}

/**
 * Mengacak array (Fisher-Yates Shuffle)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate Soal Pilihan Ganda
 */
function generatePG(def, allDefs) {
  const distractors = allDefs
    .filter(d => d.subject.toLowerCase() !== def.subject.toLowerCase())
    .map(d => d.subject);
  
  // Jika distractor kurang, tambahkan dummy
  while (distractors.length < 3) {
    distractors.push(`Opsi Pengecoh ${Math.floor(Math.random() * 100)}`);
  }

  const selectedDistractors = shuffle(distractors).slice(0, 3);
  const options = shuffle([def.subject, ...selectedDistractors]);
  const correctOption = options.indexOf(def.subject);

  return {
    type: 'pg',
    question_text: `Apa istilah yang tepat untuk pernyataan berikut?\n"___ ${def.keyword} ${def.definition}."`,
    options: options,
    correct_option: correctOption,
    points: 10
  };
}

/**
 * Generate Soal Benar / Salah
 */
function generateTF(def, allDefs) {
  const isTrue = Math.random() > 0.5;
  
  if (isTrue || allDefs.length < 2) {
    return {
      type: 'tf',
      question_text: `Pernyataan berikut bernilai BENAR atau SALAH?\n"${def.subject} ${def.keyword} ${def.definition}."`,
      correct_tf: true,
      points: 10
    };
  } else {
    // Ambil definisi dari subjek lain untuk disalahkan
    const otherDef = allDefs.find(d => d.subject !== def.subject);
    return {
      type: 'tf',
      question_text: `Pernyataan berikut bernilai BENAR atau SALAH?\n"${def.subject} ${def.keyword} ${otherDef.definition}."`,
      correct_tf: false,
      points: 10
    };
  }
}

/**
 * Generate Soal Menjodohkan
 */
function generateMatching(defs) {
  // Ambil max 4 pasang
  const pairsCount = Math.min(4, defs.length);
  const selectedDefs = shuffle(defs).slice(0, pairsCount);
  
  const matchingPairs = selectedDefs.map(d => ({
    left: d.subject,
    // Potong definisi jika kepanjangan untuk dropdown
    right: d.definition.length > 60 ? d.definition.substring(0, 57) + '...' : d.definition
  }));

  return {
    type: 'matching',
    question_text: "Pasangkan istilah di sebelah kiri dengan definisi yang tepat di sebelah kanan:",
    matching_pairs: matchingPairs,
    points: 20 // Matching biasanya nilainya lebih besar
  };
}

/**
 * Fungsi Utama Generate Kuis
 */
exports.generateQuestionsFromText = (text, count = 5) => {
  const definitions = extractDefinitions(text);
  const questions = [];

  // Jika teks tidak mengandung definisi sama sekali, ambil kalimat acak untuk dijadikan soal rumpang (cloze)
  if (definitions.length === 0) {
    const cleanText = text.replace(/<[^>]+>/g, ' ');
    let validSentences = cleanText.split(/(?<=[.?!])\s+/).filter(s => s.length > 30 && s.length < 150);
    validSentences = shuffle(validSentences);

    for (let i = 0; i < count; i++) {
      if (validSentences[i]) {
        const sentence = validSentences[i].replace(/\.$/, '');
        const words = sentence.split(' ');
        // Ambil kata acak di tengah sebagai jawaban (panjang kata > 4 huruf)
        const possibleWords = words.filter(w => w.length > 4);
        const answerWord = possibleWords.length > 0 ? possibleWords[Math.floor(Math.random() * possibleWords.length)] : words[Math.floor(words.length / 2)];
        
        const questionStr = sentence.replace(answerWord, '______');
        
        const options = shuffle([answerWord, 'Konsep Lain', 'Bagian Tambahan', 'Metode Alternatif']);
        
        questions.push({
          type: 'pg',
          question_text: `Lengkapi kalimat rumpang berikut yang diambil dari materi:\n"${questionStr}"`,
          options: options,
          correct_option: options.indexOf(answerWord),
          points: 10
        });
      } else {
        // Jika tidak ada kalimat lagi
        questions.push({
          type: 'pg',
          question_text: `(Soal Sistem) Berdasarkan materi yang diberikan, bagian mana yang paling penting dipahami? (Soal ke-${i+1})`,
          options: ['Pemahaman Konsep', 'Praktek Langsung', 'Evaluasi Materi', 'Semua Benar'],
          correct_option: 3,
          points: 10
        });
      }
    }
    return questions;
  }

  // Distribusikan tipe soal
  let defsCopy = shuffle([...definitions]);

  // Coba buat 1 soal matching jika ada minimal 3 definisi
  if (defsCopy.length >= 3 && count >= 3) {
    questions.push(generateMatching(defsCopy));
    count -= 1;
  }

  // Isi dengan campuran PG dan TF selama definisi masih ada
  while (questions.length < count && defsCopy.length > 0) {
    const def = defsCopy.pop();
    const isPG = Math.random() > 0.4; // 60% PG, 40% TF

    if (isPG) {
      questions.push(generatePG(def, definitions));
    } else {
      questions.push(generateTF(def, definitions));
    }
  }

  // Jika definisi sudah habis tapi soal masih kurang, gunakan cloze test dari kalimat acak
  if (questions.length < count) {
    const cleanText = text.replace(/<[^>]+>/g, ' ');
    let validSentences = cleanText.split(/(?<=[.?!])\s+/).filter(s => s.length > 30 && s.length < 150);
    validSentences = shuffle(validSentences);
    
    let sentenceIdx = 0;
    while (questions.length < count) {
      if (validSentences[sentenceIdx]) {
        const sentence = validSentences[sentenceIdx].replace(/\.$/, '');
        const words = sentence.split(' ');
        const possibleWords = words.filter(w => w.length > 4);
        const answerWord = possibleWords.length > 0 ? possibleWords[Math.floor(Math.random() * possibleWords.length)] : words[Math.floor(words.length / 2)];
        
        const questionStr = sentence.replace(answerWord, '______');
        const options = shuffle([answerWord, 'Konsep Tambahan', 'Pendekatan Lain', 'Elemen Dasar']);
        
        questions.push({
          type: 'pg',
          question_text: `Lengkapi kalimat rumpang berikut yang diambil dari materi:\n"${questionStr}"`,
          options: options,
          correct_option: options.indexOf(answerWord),
          points: 10
        });
        sentenceIdx++;
      } else {
        // Jika teks habis sama sekali
        questions.push({
          type: 'pg',
          question_text: `(Soal Sistem) Berdasarkan materi yang diberikan, bagian mana yang paling penting dipahami? (Soal ke-${questions.length + 1})`,
          options: ['Pemahaman Konsep', 'Praktek Langsung', 'Evaluasi Materi', 'Semua Benar'],
          correct_option: 3,
          points: 10
        });
      }
    }
  }

  return questions;
};
