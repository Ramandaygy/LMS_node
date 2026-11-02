# LMS SURAJI - Web-Based Learning Management System

![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Node.js_&_Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployment-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Thesis Project](https://img.shields.io/badge/Project-Undergraduate_Thesis-blue?style=for-the-badge)

**LMS SURAJI** adalah platform *Learning Management System* berbasis web yang dikembangkan khusus untuk **SMP Negeri 1 Suradadi**. Project ini dibangun sebagai bagian dari Tugas Akhir (Skripsi) strata D4 Teknik Informatika untuk mendigitalisasi proses pembelajaran, evaluasi, absensi, hingga pengolahan rapor kurikulum merdeka.

🔗 **Live Demo:** [https://lmssmpn1suradadi.vercel.app/](https://lmssmpn1suradadi.vercel.app/)[cite: 5]

---

##  Arsitektur System & Tech Stack

Project ini menggunakan arsitektur *Client-Server* terpisah dengan rincian teknologi sebagai berikut:
- **Frontend:** React.js, React Router, Tailwind CSS / Styling Framework.
- **Backend:** Node.js, Express.js (RESTful API architecture).
- **Database:** MongoDB Atlas (Cloud NoSQL Database).
- **Deployment:** Vercel (Production environment)[cite: 5].

---

##  Fitur Utama

- **Role-Based Access Control (RBAC):** Hak akses terpisah dan aman untuk Administrator, Guru/Instruktur, dan Siswa.
- **Computer-Based Test (CBT):** Modul ujian online interaktif dengan dukungan berbagai tipe soal (pilihan ganda, esai, hingga soal menjodohkan).
- **Sistem Absensi Digital:** Pencatatan kehadiran siswa secara *real-time* yang terintegrasi dengan database sekolah.
- **Rule-Based Engine Evaluasi:** Mekanisme pemrosesan logika aturan untuk kualifikasi penilaian dan pemantauan performa akademik siswa.
- **Pengolahan e-Rapor Kurikulum Merdeka:** Rekapitulasi nilai akhir dan cetak laporan hasil belajar siswa secara otomatis.

---

##  Quality Assurance & Testing

Dalam pengembangan sistem berskala akademik dan operasional ini, beberapa tahap pengujian telah diterapkan:
- **API Testing & Validation:** Validasi *endpoint* backend menggunakan Postman untuk memastikan integritas data, *payload response*, dan *error handling* berjalan stabil.
- **Functional & UI Testing:** Pengujian alur fungsionalitas utama (mulai dari autentikasi login multi-role, pengiriman jawaban CBT, hingga rekapitulasi nilai rapor).

---

## 🚀 Cara Menjalankan Project (Local Development)

### Prasyarat
- Node.js (v16 atau versi terbaru)
- Koneksi MongoDB Atlas / Local MongoDB Instance

### 1. Clone Repository
```bash
git clone [https://github.com/Ramandaygy/LMS_node.git](https://github.com/Ramandaygy/LMS_node.git)
cd LMS_node
