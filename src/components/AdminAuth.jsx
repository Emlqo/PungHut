import React, { useState } from 'react';

// 💡 여기 이름을 App.jsx와 똑같이 onSuccess로 맞췄습니다!
export default function AdminAuth({ onSuccess }) {
  const [pwd, setPwd] = useState('');

  const handleLogin = () => {
    if (pwd === 'didtnsdl') {
      onSuccess(); // 💡 여기도 onSuccess()를 실행하도록 변경!
    } else {
      alert('비밀번호가 틀렸습니다!');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
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
          onKeyDown={handleKeyDown} 
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
