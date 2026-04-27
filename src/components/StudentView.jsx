import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, update, get } from 'firebase/database';

export default function StudentView({ onBack }) {
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [gameData, setGameData] = useState({ state: 'waiting' });
  const [hasAnswered, setHasAnswered] = useState(false);

  const join = async () => {
    if(!roomCode || !name) return alert('클래스 코드와 닉네임을 모두 입력해주세요!');
    
    try {
      const snap = await get(ref(db, 'active_sessions/' + roomCode));
      const data = snap.val();
      
      if(!data) return alert('존재하지 않는 코드입니다! 선생님 화면에 뜬 4자리 코드를 확인하세요.');
      if(data.isLocked) return alert('입장이 마감된 방입니다! 선생님께 문을 열어달라고 말씀하세요.');

      await set(ref(db, 'active_sessions/' + roomCode + '/players/' + name), { score: 0, answer: null });
      
      setIsJoined(true);
      
      onValue(ref(db, 'active_sessions/' + roomCode), snap2 => {
        const liveData = snap2.val();
        if(!liveData) {
          alert('선생님이 방을 종료했습니다.');
          setIsJoined(false);
        } else {
          setGameData(liveData);
        }
      });
    } catch (error) {
      alert('서버 오류로 입장하지 못했습니다: ' + error.message);
      console.error(error);
    }
  };

  const sendAnswer = (idx) => {
    if(hasAnswered) return;
    setHasAnswered(true);
    update(ref(db, 'active_sessions/' + roomCode + '/players/' + name), {
      answer: idx,
      answerTime: Date.now(),
      questionStartTime: gameData.startTime
    });
  };

  useEffect(() => {
    if(gameData.state === 'question') setHasAnswered(false);
  }, [gameData.state, gameData.currentIdx]);

  if(!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-500 p-6 relative">
        <button onClick={onBack} className="absolute top-8 left-8 px-4 py-2 bg-indigo-600 text-white rounded font-bold shadow">← 처음으로</button>
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-sm">
          <h2 className="text-4xl font-black text-center mb-10 text-slate-800">게임 입장</h2>
          <input type="text" placeholder="선생님이 알려준 4자리 코드" maxLength="4" className="w-full p-5 border-4 border-slate-200 rounded-2xl mb-4 text-center text-xl font-bold focus:border-indigo-500 outline-none" value={roomCode} onChange={e=>setRoomCode(e.target.value)} />
          <input type="text" placeholder="내 이름 (예: 홍길동)" className="w-full p-5 border-4 border-slate-200 rounded-2xl mb-10 text-center text-xl font-bold focus:border-indigo-500 outline-none" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} />
          <button onClick={join} className="w-full py-6 bg-amber-400 text-amber-900 rounded-2xl font-black text-3xl shadow-[0_8px_0_#d97706] active:translate-y-2 active:shadow-none transition-all">도전!</button>
        </div>
      </div>
    );
  }

  const currentScore = gameData.players && gameData.players[name] ? gameData.players[name].score : 0;

  return (
    <div className="p-4 min-h-screen flex flex-col bg-slate-100 text-center">
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 flex justify-between items-center border-b-4 border-indigo-200">
        <span className="font-black text-xl text-slate-700">👤 {name}</span>
        <span className="font-black text-2xl text-amber-500">⭐ {currentScore} pt</span>
      </div>

      {gameData.state === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-slate-500 leading-relaxed">준비 완료!<br/>선생님이 게임을 시작할 때까지<br/>대기하세요.</div>
        </div>
      )}
      
      {gameData.state === 'question' && (
        <div className="flex-1 flex flex-col gap-4">
          {hasAnswered ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-200 rounded-3xl">
              <div className="text-3xl font-black text-slate-600">제출 완료!<br/>앞 화면을 보세요.</div>
            </div>
          ) : (
            ['bg-red-500','bg-blue-500','bg-amber-400','bg-emerald-500'].map((color, i) => (
              <button key={i} onClick={()=>sendAnswer(i)} className={`flex-1 rounded-[2rem] shadow-[0_10px_0_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-none transition-all ${color}`}></button>
            ))
          )}
        </div>
      )}

      {gameData.state === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-indigo-100 rounded-3xl">
          <div className="text-4xl font-black text-indigo-700">앞 화면에서<br/>정답을 확인하세요!</div>
        </div>
      )}
      
      {gameData.state === 'final' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-amber-100 rounded-3xl">
          <div className="text-5xl font-black text-amber-600 mb-4">게임 종료!</div>
          <div className="text-2xl font-bold text-slate-600">내 최종 점수: {currentScore}점</div>
        </div>
      )}
    </div>
  );
}
