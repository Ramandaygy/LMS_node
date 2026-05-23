import React from 'react';

const Tentang = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Tentang LMS SMPN 167 Jakarta</h1>
      <div className="max-w-3xl mx-auto">
        <p className="text-gray-700 mb-4">
          LMS (Learning Management System) SMPN 167 Jakarta adalah platform pembelajaran digital yang dikembangkan untuk mendukung proses belajar mengajar secara online.
        </p>
        <p className="text-gray-700 mb-4">
          Dengan sistem ini, siswa dapat mengakses materi pelajaran, mengerjakan tugas, dan melihat progress belajar mereka. Guru dapat mengelola kelas, memberikan nilai, dan memantau perkembangan siswa. Orang tua juga dapat memantau progress belajar anak mereka.
        </p>
        <h2 className="text-2xl font-semibold mt-6 mb-3">Visi</h2>
        <p className="text-gray-700">Mewujudkan generasi berprestasi, berakhlak mulia, dan berwawasan global.</p>
        <h2 className="text-2xl font-semibold mt-6 mb-3">Misi</h2>
        <ul className="list-disc list-inside text-gray-700">
          <li>Meningkatkan kualitas pembelajaran berbasis teknologi</li>
          <li>Mengembangkan potensi siswa melalui kegiatan ekstrakurikuler</li>
          <li>Membangun karakter siswa yang berakhlak mulia</li>
          <li>Menciptakan lingkungan sekolah yang nyaman dan kondusif</li>
        </ul>
      </div>
    </div>
  );
};

export default Tentang;