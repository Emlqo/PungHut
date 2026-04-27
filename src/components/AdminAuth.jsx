import React, { useState } from 'react';

export default function AdminAuth({ onLogin }) {
  const [pwd, setPwd] = useState('');

  const handleLogin = () => {
  
    if (pwd === 'didtnsdl') {
      onLogin();
    } else {
      alert('비밀번호가 틀렸습니다!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <h2 className="text-3xl font-black text-indigo-600 mb-6">선생님 로그인</h2>
        <input 
          type="password" 
          placeholder="비밀번호 입력" 
          className="w-full p-4 border-2 border-slate-200 rounded-xl mb-4 text-center text-xl font-bold focus:border-indigo-500 outline-none"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <button 
          onClick={handleLogin}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xl hover:bg-indigo-700 transition"
        >
          관리자 입장
        </button>
      </div>
    </div>
  );
}
