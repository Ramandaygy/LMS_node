import React from 'react';

const Kontak = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Hubungi Kami</h1>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Alamat</h2>
          <p className="text-gray-700">Jl. Contoh Alamat No. 123, Jakarta Timur</p>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Telepon</h2>
          <p className="text-gray-700">(021) 12345678</p>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Email</h2>
          <p className="text-gray-700">info@smpn167jakarta.sch.id</p>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Jam Operasional</h2>
          <p className="text-gray-700">Senin - Jumat: 07:00 - 16:00</p>
        </div>
      </div>
    </div>
  );
};

export default Kontak;