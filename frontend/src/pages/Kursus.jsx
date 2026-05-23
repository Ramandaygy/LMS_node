import React from 'react';

const Kursus = () => {
  const courses = [
    { id: 1, title: 'Matematika', description: 'Belajar matematika dasar hingga lanjutan', level: 'SMP' },
    { id: 2, title: 'Bahasa Indonesia', description: 'Meningkatkan kemampuan berbahasa Indonesia', level: 'SMP' },
    { id: 3, title: 'Bahasa Inggris', description: 'Belajar grammar, speaking, dan writing', level: 'SMP' },
    { id: 4, title: 'IPA', description: 'Ilmu Pengetahuan Alam', level: 'SMP' },
    { id: 5, title: 'IPS', description: 'Ilmu Pengetahuan Sosial', level: 'SMP' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Daftar Kursus</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => (
          <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
            <p className="text-gray-600 mb-2">{course.description}</p>
            <p className="text-sm text-blue-600">Level: {course.level}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kursus;