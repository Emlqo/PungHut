import React from 'react';

export default function HomeView({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-700 text-white p-6">
      <h1 className="text-6xl title-font mb-12 drop-shadow-2xl">Vibe-hoot! 🚀</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button onClick={() => onSelect('student')} className="p-8 bg-amber-400 text-amber-900 rounded-3xl text-3xl font-black shadow-xl hover:scale-105 transition">학생 입장하기</button>
        <button onClick={() => onSelect('admin_auth')} className="p-8 bg-white text-indigo-700 rounded-3xl text-3xl font-black shadow-xl hover:scale-105 transition">선생님 관리자</button>
      </div>
    </div>
  );
}
