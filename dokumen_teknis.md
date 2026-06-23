# Dokumen Teknis & Developer Manual (Production-Grade)

**Proyek:** Learning Management System (LMS) + AI Progress Monitoring
**Versi Dokumen:** 1.2.0 (Final Production Edition)
**Terakhir Diperbarui:** 21 Juni 2026

Dokumen ini merupakan pedoman komprehensif (*Production-Grade*) bagi *Developer*, *DevOps*, atau *System Administrator* yang akan memelihara, mengembangkan, atau melakukan *deploy* aplikasi ini dari tahap lokal hingga ke server *Production*.

---

## 1. Persyaratan Sistem (*System Requirements*)

*   **Node.js**: Minimal versi `v18.x` LTS (Rekomendasi `v20.x` atau `v22.x`).
*   **Database**: MongoDB `v6.0` ke atas (Cloud MongoDB Atlas sangat disarankan untuk *Production*).
*   **Process Manager**: PM2 (berjalan di mode *fork*).
*   **Web Server / Reverse Proxy**: Nginx.

---

## 2. Struktur Direktori & Build Tool

Aplikasi menggunakan arsitektur *Client-Server*:

### A. Backend (`/backend`)
Menggunakan **Node.js + Express.js**:
```text
backend/
├── config/            # Konfigurasi Database & Global
├── controllers/       # Logika bisnis utama (Admin, Guru, Siswa, Progress)
├── middleware/        # Interseptor (Auth JWT, Rate Limiting)
├── models/            # Skema Mongoose (User, Class, Subject, Assignment)
├── routes/            # Pengaturan URL Endpoints
├── services/          # Logika kompleks (rfService.js untuk Random Forest)
├── server.js          # Entry point aplikasi
└── .env               # File kredensial [JANGAN DI-COMMIT]
```

### B. Frontend (`/frontend`)
⚠️ **Klarifikasi Build Tool:** Frontend secara mutlak dibangun menggunakan **Create React App (`react-scripts`)**, BUKAN Vite.
```text
frontend/
├── src/
│   ├── components/    # Reusable UI (Glassmorphism layout)
│   ├── pages/         # Halaman Utama (Login, Siswa Binaan, dll)
│   ├── services/      # Axios interceptors (api.js)
│   ├── styles/        # Manual CSS / Vanilla CSS (Tidak memakai Tailwind)
│   └── App.jsx        # Routing utama React Router
└── package.json       # Dependencies & Scripts (react-scripts build)
```

---

## 3. Database Schema & Relasi (Minimal)

Sistem memecah pengguna ke dalam beberapa koleksi terpisah untuk isolasi keamanan, berikut skema inti dari setiap *Collection* di MongoDB:

1.  **`users_siswa`**
    *   `_id` (ObjectId)
    *   `full_name`, `nis`, `email`, `password` (Hashed)
    *   `class_id` (Referensi ke `classes`)
    *   `parent_id` (Referensi ke `users_ortu`)
2.  **`users_guru`**
    *   `_id` (ObjectId)
    *   `full_name`, `nip`, `email`, `password` (Hashed)
    *   `classes` (Array of `class_id`)
    *   `subjects` (Array of `subject_id`)
3.  **`users_ortu`** & **`users_admin`**
    *   Struktur identitas standar. `users_ortu` memiliki `children` (Array of `student_id`).
4.  **`classes`**
    *   `_id`, `name` (contoh: "7A")
    *   `homeroom_teacher` (Referensi ke wali kelas / `users_guru`)
5.  **`assignments`** & **`submissions`**
    *   `assignments`: `title`, `description`, `class_id`, `subject_id`, `deadline`.
    *   `submissions`: `assignment_id`, `student_id`, `file_url`, `score`.
6.  **`grades`** (Untuk Ulangan/Ujian formal)
    *   `student` (ObjectId siswa), `subject` (ObjectId mapel), `teacher` (ObjectId guru).
    *   `type` (Enum: `uts`, `uas`, `quiz`, `tugas`), `score` (Number 0-100).

*(Catatan: Migrasi relasi untuk field `class_id` di-handle secara dinamis menggunakan sintaks interseptor Mongoose `$or` untuk mendukung baik tipe `String` maupun `ObjectId` di level query).*

---

## 4. API Endpoints Utama

Seluruh API menggunakan format prefix: `http://[host]:5000/api` dan merespon dengan format JSON: `{ "success": boolean, "message": string, "data": {} }`.

### Autentikasi (`/auth`)
*   `POST /login` : Login Multi-Role (Return: JWT Token).
*   `POST /register/ortu` : Registrasi akun wali murid.

### Akses Admin (`/admin`) - *Butuh Token Admin*
*   `GET /users/:role` : Menarik daftar pengguna (guru/siswa/ortu).
*   `POST /users` : Menambah data pengguna baru.
*   `POST /export/:collection` : Unduh data (CSV/Excel).

### Akses Guru (`/guru`) - *Butuh Token Guru*
*   `GET /students` : Mendapatkan daftar lengkap **Siswa Binaan** (khusus Wali Kelas).
*   `POST /grades/input` : Menyimpan nilai UTS/UAS siswa.
*   `GET /students/:id/grades` : Mendapatkan detail riwayat nilai ujian satu orang siswa.

### Modul AI / Prediksi (`/progress`)
*   `GET /class/:classId` : Men- *trigger* model Random Forest untuk menganalisis dan memprediksi tingkat risiko belajar seluruh siswa dalam satu kelas secara *real-time*.

---

## 5. Deployment & DevOps Strategy

### A. Environment Variables (`.env`)
Buat file `.env.example` dan letakkan `.env` asli di server secara rahasia:
```env
PORT=5000
MONGO_URI=mongodb://[user]:[pass]@[host]:27017/lms_production
JWT_SECRET=super_secret_jwt_key
CLIENT_URL=https://lms.domainanda.com
```

### B. Konfigurasi Server (PM2 + Nginx)
⚠️ **Peringatan Kritis PM2:** Karena modul AI (Random Forest) memuat *state* secara *Singleton* pada memori saat server menyala, **JANGAN MENGGUNAKAN CLUSTER MODE (`-i max`)** pada PM2. Jika menggunakan mode cluster, *worker* Node.js akan memiliki memori ML yang terpisah-pisah, menyebabkan anomali prediksi!
*   ✅ **Gunakan Mode Fork (Default):**
    `pm2 start server.js --name "lms-backend"`
*   Setup Nginx Reverse Proxy untuk meneruskan trafik `port 80/443 (HTTPS)` ke `localhost:5000`.

### C. Build & Deploy Frontend
1. Masuk ke folder `/frontend`
2. Jalankan `npm run build`
3. Hasil di folder `/build` dapat dihosting sebagai *Static Files* melalui Nginx, Vercel, Netlify, atau AWS S3.

---

## 6. Keamanan & Skalabilitas

1.  **CORS & Input Validation:** Ubah konfigurasi `cors()` pada `server.js` untuk membatasi *origin* hanya ke URL Frontend. Sangat disarankan menambahkan validasi input (seperti Joi) untuk menghindari NoSQL Injection.
2.  **Rate Limiting:** Terapkan `express-rate-limit` pada jalur rentan seperti `/api/auth/login`.
3.  **Indexing MongoDB:** Pastikan membuat *Index* (`createIndex`) pada koleksi `users_siswa` untuk atribut `nis` dan `class_id` untuk optimasi pencarian berkapasitas besar.

---

## 7. Arsitektur Machine Learning (Random Forest)

Algoritma menggunakan `ml-random-forest` yang dioperasikan melalui file `backend/services/rfService.js`.

*   **Proses Inisialisasi:** Saat ini, `generateSyntheticData(1000)` dijalankan *on-the-fly* pada memori setiap kali server Node.js *restart*.
*   **Risiko Production:** Hal ini dapat memicu **Data Drift** dan inkonsistensi akurasi jika Node.js mati/hidup berulang kali. 
*   **Saran Skalabilitas Jangka Panjang:** Lakukan pemisahan modul. *Training* model dilakukan di *environment* terpisah menggunakan Python, *export* model tersebut (misal dalam bentuk ONNX/Pickle ekuivalen di JS), sehingga server Node.js murni hanya memanggil fungsi *Predict* secara mandiri dan *stateless*.

---

## 8. Kontribusi & Testing Workflow

*   **Testing:** Belum ada sistem *Automated Testing*. Tim pengembang berikutnya wajib mengatur konfigurasi **Jest** + **Supertest** untuk Backend, dan **React Testing Library** untuk Frontend.
*   **Git Workflow:** Dilarang commit langsung ke `main`. Harap gunakan model percabangan `feature/...` atau `hotfix/...` dan *merge* menggunakan PR (*Pull Request*). Gunakan `ESLint` untuk standardisasi.
