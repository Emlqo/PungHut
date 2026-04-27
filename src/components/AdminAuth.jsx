import React, { useState } from 'react';

const ADMIN_PASSWORD = "vnddidwnd";

export default function AdminAuth({ onSuccess }) {
  const [pw, setPw] = useState('');
  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) onSuccess();
    else alert('비밀번호가 틀렸습니다.');
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-800 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">선생님 로그인</h2>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} className="w-full p-4 border-2 rounded-xl mb-4 text-center text-xl" placeholder="비밀번호 입력" />
        <button onClick={handleLogin} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xl">입장</button>
      </div>
    </div>
  );
}
