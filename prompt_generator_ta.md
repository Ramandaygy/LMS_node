# Prompt AI untuk Pembuatan Laporan TA

*Silakan salin (copy) seluruh teks di bawah garis ini, lalu tempel (paste) ke ChatGPT, Claude, atau AI lainnya untuk membuat laporan Tugas Akhir Anda secara otomatis.*

---

**Tolong buatkan draf Laporan Tugas Akhir (TA) untuk jenjang S1/D4 dengan detail proyek sebagai berikut:**

**1. Identitas Proyek**
- **Judul:** Rancang Bangun Learning Management System dengan Monitoring Performa Belajar Siswa Menggunakan Algoritma Random Forest (Studi kasus: SMP N 1 Suradadi).
- **Latar Belakang Singkat:** Kurangnya pemantauan dini terhadap performa belajar siswa (Siswa sering lambat ditangani jika nilainya turun). Sistem LMS tradisional hanya sebatas absensi dan upload tugas, namun tidak bisa memprediksi risiko kegagalan. Oleh karena itu, dibangunlah LMS modern yang terintegrasi dengan Machine Learning (Algoritma Random Forest) untuk memprediksi tingkat risiko belajar siswa secara otomatis dan *real-time*.

**2. Teknologi yang Digunakan (Tech Stack)**
- **Frontend:** React.js (menggunakan Create React App), Vanilla CSS (CSS Manual murni dengan teknik Glassmorphism & UI interaktif modern).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (menggunakan Mongoose dengan struktur koleksi yang terfragmentasi per tipe *user*).
- **Machine Learning:** Library `ml-random-forest` murni berbasis JavaScript (berjalan langsung di server Node.js tanpa butuh Python). Algoritma menggunakan parameter `nEstimators: 50` dan `maxFeatures: 2`.

**3. Hak Akses (Aktor) dan Fungsionalitas Utama**
- **Siswa:** Bisa melihat materi, mengerjakan kuis interaktif, absensi, dan mengumpulkan tugas. Bisa melihat metrik performanya sendiri.
- **Guru:** Bisa mengunggah modul materi, membuat penugasan, melakukan absensi manual, dan menilai tugas. Khusus untuk Wali Kelas, tersedia menu "Progress Siswa" untuk memantau Siswa Binaan beserta hasil prediksi AI terhadap mereka.
- **Orang Tua:** Punya dashboard khusus untuk login menggunakan `parent_id` dan memantau performa serta hasil prediksi AI anak mereka dari rumah secara *real-time*.
- **Admin:** Memiliki kontrol penuh atas Master Data (Guru, Siswa, Kelas, Mata Pelajaran, relasi Wali Kelas) dan fitur eksport/import laporan ke format Excel.

**4. Parameter / Variabel Prediksi Random Forest (Fitur)**
Model AI dilatih dari 1000 dataset sintetik menggunakan 4 variabel utama yang diambil dari aktivitas siswa dalam LMS:
1. **Rata-rata Tugas (`avgScore`)**: Total nilai dari pengumpulan penugasan rutin dibagi rata-rata ideal.
2. **Kehadiran (`attendanceRate`)**: Persentase kehadiran (jumlah masuk dibagi total tatap muka).
3. **Ketuntasan Materi (`materialCompletionRate`)**: Progres bacaan modul siswa.
4. **Rata-rata Kuis (`quizScore`)**: Nilai langsung dari Kuis singkat.

**5. Hasil Output AI (Label)**
Berdasarkan keempat variabel tersebut, Random Forest akan melakukan klasifikasi kondisi siswa ke dalam 3 level:
- **High Risk (Risiko Tinggi - Label 0):** Jika variabel-variabel tersebut jauh di bawah KKM.
- **Medium Risk (Risiko Sedang - Label 1):** Jika performa kurang ideal namun belum dalam tahap krisis.
- **Low Risk (Risiko Rendah - Label 2):** Jika performa konsisten baik.
*(Sistem juga memiliki fitur "Explainability" (Insight AI) di frontend, yang menjabarkan dalam bentuk kalimat deskriptif alasan MENGAPA siswa tersebut divonis risiko tinggi).*

**Instruksi Tambahan untuk AI:**
Berbekal informasi teknis dan alur di atas, tolong buatkan kerangka dan isi untuk:
1. **Bab 1 (Pendahuluan):** Latar belakang masalah, rumusan masalah, batasan masalah, dan tujuan penelitian.
2. **Bab 2 (Tinjauan Pustaka):** Penjelasan landasan teori tentang LMS, Algoritma Random Forest, MERN Stack (MongoDB, Express, React, Node), dan konsep Early Warning System di dunia pendidikan.
3. **Bab 3 (Metodologi Penelitian / Perancangan Sistem):** Analisis kebutuhan (Use case aktor), alur sistem (Flowchart prediksi AI), dan struktur relasi database.
4. **Bab 4 (Hasil dan Pembahasan):** Skenario pengujian algoritma (akurasi training dari 1000 data sintetik dengan 50 Decision Trees), serta tampilan dashboard Explainability AI yang membantu guru BK / Wali kelas dalam intervensi.

Buatkan teksnya dengan bahasa akademis Indonesia yang formal, terstruktur rapi, dan mudah disalin ke dalam dokumen Microsoft Word. Mulailah dari Bab 1 terlebih dahulu.
