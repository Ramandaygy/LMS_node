# Dokumen Teknis & Materi Laporan Tugas Akhir (TA)

**Judul Tugas Akhir:** Rancang Bangun Learning Management System dengan Monitoring Performa Belajar Siswa Menggunakan Algoritma Random Forest (Studi Kasus: SMP N 1 Suradadi)

Dokumen ini disusun sebagai panduan teknis menyeluruh (manual book developer) sekaligus rujukan utama dalam penulisan Bab III (Metodologi Penelitian) dan Bab IV (Hasil dan Pembahasan) pada laporan Tugas Akhir.

---

## 1. Arsitektur & Teknologi (Tech Stack)

Sistem ini dikembangkan menggunakan arsitektur **Client-Server (MERN-like Stack)** yang terpisah antara *Frontend* dan *Backend*, memanfaatkan komunikasi RESTful API.

### Frontend
*   **Library:** React.js (dibangun menggunakan *Create React App* / `react-scripts`).
*   **Styling:** Vanilla CSS (CSS Manual murni) dengan implementasi *Glassmorphism* dan desain UI/UX modern.
*   **Routing:** React Router DOM (v6)
*   **State Management:** React Hooks (`useState`, `useEffect`)
*   **HTTP Client:** Axios (dengan interseptor untuk menyisipkan JWT Token)

### Backend
*   **Framework:** Node.js dengan Express.js
*   **Database:** MongoDB (dengan ODM Mongoose serta penggunaan native driver collection untuk fleksibilitas struktur)
*   **Authentication:** JSON Web Token (JWT) untuk sesi login, `bcryptjs` untuk enkripsi *password*.
*   **Machine Learning:** Library `ml-random-forest` murni berjalan di atas Node.js (JavaScript).

---

## 2. Aktor & Use Case Sistem

Sistem ini memiliki 4 aktor utama dengan peran *(role)* masing-masing:

1.  **Siswa (Role: `siswa`)**
    *   Melihat materi pelajaran, jadwal, dan daftar absen.
    *   Mengunduh dan mengerjakan tugas *(Submit Assignment)*.
    *   Mengikuti Ujian / Live Quiz.
    *   Melihat nilai (Tugas, Kuis, UTS, UAS) dan performa prediksi AI miliknya sendiri.
2.  **Guru (Role: `guru`)**
    *   Mengelola (CRUD) Materi, Tugas, dan Kuis interaktif sesuai kelas dan mata pelajaran yang diampunya.
    *   Melakukan presensi manual kehadiran siswa.
    *   Menilai tugas yang dikumpulkan siswa.
    *   **Khusus Wali Kelas:** Dapat melihat daftar **Siswa Binaan**, menginput nilai UTS/UAS (rapor), dan memonitor **Prediksi AI Progress Belajar** menggunakan model Random Forest.
3.  **Admin (Role: `admin`)**
    *   Pusat kendali master data (CRUD Master Kelas, Mata Pelajaran, Data Guru, Siswa, Orang Tua).
    *   Mengatur relasi (Siapa Wali Kelas, Guru mengajar mata pelajaran apa).
    *   Export dan Import data menggunakan Excel/CSV.
4.  **Orang Tua (Role: `ortu`)**
    *   Masuk menggunakan *parent_id* yang terhubung dengan *student_id* (anaknya).
    *   Memonitor secara *real-time* absensi, nilai, serta status risiko belajar anak yang diprediksi oleh AI.

---

## 3. Struktur Database (Koleksi / *Collections*)

Sistem tidak menggunakan pendekatan *monolithic users table* secara mutlak. Data pengguna dipecah (fragmentasi) berdasarkan peran, demi isolasi data yang lebih baik.

*   `users_siswa`: Menyimpan `full_name`, `nis`, `password` (hashed), `class_id` (relasi ke kelas), `parent_id` (relasi ke ortu).
*   `users_guru`: Menyimpan `full_name`, `nip`, `classes` (array of `class_id`), `subjects` (array of `subject_id`).
*   `users_admin`: Menyimpan kredensial admin.
*   `users_ortu`: Menyimpan data orang tua dan relasi `children` (array of `student_id`).
*   `classes`: Menyimpan master kelas (contoh: 7A, 8B) dan relasi `homeroom_teacher` (Wali Kelas).
*   `subjects`: Menyimpan master mata pelajaran.
*   `materials`: Menyimpan modul pembelajaran (PDF, Video, Teks).
*   `assignments`: Menyimpan data penugasan, batas waktu (*deadline*), dan tipe soal.
*   `submissions`: Relasi pengumpulan tugas oleh siswa. Menyimpan file jawaban siswa dan `score` (nilai yang diberikan guru).
*   `grades`: Menyimpan nilai ujian formal (UTS, UAS, Quiz). Memiliki field `student`, `subject`, `type`, dan `score`.
*   `attendances`: Menyimpan riwayat absen per pertemuan (status: `present`, `absent`, `late`, `excused`).

---

## 4. Algoritma Prediksi Random Forest (Inti TA)

LMS ini unggul karena menerapkan algoritma ML untuk deteksi dini risiko kegagalan akademis siswa. 

### A. Fitur (Variabel Independen / X)
Sistem mengekstrak 4 fitur utama dari aktivitas siswa secara *real-time* untuk menjadi bahan prediksi AI:
1.  **`avgScore` (Rata-rata Nilai Tugas):** Dihitung dari keseluruhan total *score* tugas yang dikumpulkan (dari tabel `submissions`).
2.  **`attendanceRate` (Persentase Kehadiran):** Jumlah pertemuan dimana status siswa adalah `present` dibagi dengan total pertemuan yang tercatat.
3.  **`materialCompletionRate` (Ketuntasan Materi):** Diukur dari apakah siswa sudah membaca materi atau belum (melacak interaksi di UI, dapat berupa progres modul).
4.  **`quizScore` (Rata-rata Kuis):** Dihitung dari riwayat nilai (dari tabel `grades` dimana `type = 'quiz'`).

### B. Label (Variabel Dependen / Y)
Klasifikasi dibagi menjadi 3 tingkat risiko kelas:
*   `0`: Risiko Tinggi (*High Risk* - Merah)
*   `1`: Risiko Sedang (*Medium Risk* - Kuning)
*   `2`: Risiko Rendah (*Low Risk* - Hijau)

### C. Alur Pelatihan (Training) Model
Pada `rfService.js`, sistem menghasilkan *synthetic dataset* sebanyak 1000 observasi awal (saat sistem pertama kali dinyalakan/dipicu) untuk melatih pohon keputusan. 

**Rumus "Rule Base" untuk pelabelan awal data sintetik:**
*   High Risk (0) jika: `avgScore < 60` ATAU `attendance < 70` ATAU `material < 50` ATAU `quiz < 50`
*   Medium Risk (1) jika: `avgScore < 75` ATAU `attendance < 85` ATAU `material < 75` ATAU `quiz < 70`
*   Low Risk (2) jika: Kondisi selain di atas terpenuhi.

> **Catatan Penting untuk TA:** Dalam model sintetik, sistem menyuntikkan *noise* secara acak (probabilitas 5%) pada pelabelan. Ini dilakukan agar model algoritma Random Forest benar-benar belajar dari sebaran data dan pola probabilitas, bukan sekadar menjadi fungsi algoritma `IF-ELSE` linier biasa.

### D. Parameter Random Forest
Library `ml-random-forest` yang dipakai memiliki hyperparameter:
*   **`nEstimators`**: `50` (Akan membangun 50 buah *Decision Trees* independen).
*   **`maxFeatures`**: `2` (Pada setiap cabang/split, algoritma akan memilih 2 fitur secara acak untuk diuji, ini untuk memastikan keragaman pohon/ *tree correlation* yang rendah).

### E. Alur Prediksi (Prediction)
1. Guru Wali Kelas membuka menu **Progress Siswa**.
2. Frontend me- *request* API ke `/api/progress/class/:classId`.
3. Backend (`progressService.js`) menghitung secara *real-time* ke-empat fitur X (Tugas, Absen, Materi, Kuis) dengan query ke Database.
4. Ke-empat angka tersebut dimasukkan ke model Random Forest: `rfClassifier.predict([[avgScore, attendanceRate, materialCompletionRate, quizScore]])`.
5. Model akan melakukan *Voting* dari 50 pohon (Pohon A memprediksi risiko 0, Pohon B memprediksi 1, dll). Kelas dengan *vote* terbanyak menjadi hasil prediksi akhir.
6. Backend meramu hasil prediksi tersebut ke dalam bentuk narasi (Contoh: "Perlu perhatian serius, kehadiran sangat rendah (60%) menjadi faktor utama").

---

## 5. Rumus Matematika (Alur Perhitungan Penilaian)

### 1. Rata-rata Nilai Tugas (avgScore)
Sistem tidak menjumlah dan membagi skor biasa, namun memperhitungkan `total_score` (maksimal skor) dari setiap tugas:
```math
avgScore = \left( \frac{\sum \text{Score Siswa pada Tugas}_{i}}{\sum \text{Max Score dari Tugas}_{i}} \right) \times 100
```
Jika `Max Score` tidak diisi oleh guru, secara *default* bernilai `100`.

### 2. Persentase Kehadiran (attendanceRate)
```math
attendanceRate = \left( \frac{\text{Jumlah Pertemuan (status = 'present')}}{\text{Total Pertemuan Kelas}} \right) \times 100
```

### 3. Rata-rata Nilai UTS / UAS (Pada Siswa Binaan)
Dihitung ketika guru meninjau Siswa Binaan. Diambil dari koleksi `grades`:
```math
Rata Rata = \frac{\sum (\text{Nilai UTS}_{i} + \text{Nilai UAS}_{i})}{n}
```

---

## 6. Integrasi Frontend - Dashboard Progress (UI/UX)

Untuk membuat sistem lebih *Intelligent* dan ramah bagi pengguna, sistem LMS tidak hanya menampilkan angka risiko AI secara kaku.

*   Pada **`GuruProgress.jsx`**, Frontend membongkar fitur (Tugas, Absen, Kuis, Materi) dan menyandingkannya dengan hasil prediksi AI.
*   Terdapat **Insight Prediksi AI (Algoritma Penjelasan / Explainability)**. UI di-program dengan struktur *Rule-checking* tambahan: jika AI mengatakan "Risiko Tinggi", sistem akan menyisir metrik mana yang paling kecil dan melabelinya sebagai "Faktor Utama" di dalam teks deskripsi, sehingga guru bisa tahu *mengapa* AI mendiagnosis siswa tersebut berisiko.
*   Visualisasi dibuat interaktif: berupa bar progress dan kode warna otomatis (`Red` = Bahaya, `Yellow` = Waspada, `Green` = Aman).

---

## 7. Penanganan Anomali Struktur Relasi Database (Siswa Binaan / Get Students)

Sistem menggunakan driver Mongoose secara canggih. Untuk fitur "Siswa Binaan" di `guruController.js`, *homeroom_teacher* (guru) mencari kelas yang dipegangnya:
1.  Guru mengambil Array Kelas (`classIds`) miliknya.
2.  Karena sistem tidak menggunakan *Mongoose schema* yang ketat (skema dinamis untuk performa cepat pada relasi antar koleksi terpisah), `class_id` siswa dapat tersimpan sebagai `String` maupun tipe `ObjectId`.
3.  Sistem melakukan pencarian berlapis menggunakan `$or`:
```javascript
const students = await studentCol.find({
  $or: [
    { class_id: { $in: classIds } }, // Mencari class_id bertipe ObjectId
    { class_id: { $in: classIdStrings } } // Mencari class_id bertipe Teks / String
  ]
}).toArray();
```
Hal ini memastikan tidak ada "Siswa yang Hilang / Data kosong" akibat perbedaan migrasi tipe data antar versi.

---

## Tips Penulisan Skripsi / TA:
1.  **Di Bab Analisis:** Tekankan pada kebutuhan sekolah untuk tidak sekadar "Bisa Absen dan Nilai", tapi ada unsur Prediksi Dini (Early Warning System) dengan Random Forest untuk menekan angka tinggal kelas / putus sekolah.
2.  **Di Bab Perancangan:** Masukkan ERD (Entity Relationship Diagram) berdasarkan 6 poin di Struktur Database (di atas).
3.  **Di Bab Pengujian:** Jelaskan bagaimana model ML dilatih secara internal *(on the fly)* saat node server dinyalakan menggunakan library `ml-random-forest` dengan data sintetik, dan buktikan (screenshot) bahwa halaman Dashboard Progress Siswa dapat membedakan mana siswa berisiko dan tidak.
4.  **Kontribusi Akademis:** Sebutkan penggunaan interseptor `$or` pada kueri basis data untuk ketahanan (*robustness*) tipe relasi yang asinkron dan dinamis.
