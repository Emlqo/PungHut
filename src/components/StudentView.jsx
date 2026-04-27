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
      if(!data) return alert('존재하지 않는 코드입니다!');
      if(data.isLocked) return alert('입장이 마감되었습니다!');
      await set(ref(db, 'active_sessions/' + roomCode + '/players/' + name), { score: 0, answer: null });
      setIsJoined(true);
      onValue(ref(db, 'active_sessions/' + roomCode), snap2 => {
        const liveData = snap2.val();
        if(!liveData) { setIsJoined(false); } else { setGameData(liveData); }
      });
    } catch (error) { alert('입장 오류: ' + error.message); }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-500 p-6 relative text-white">
        <button onClick={onBack} className="absolute top-8 left-8 px-4 py-2 bg-indigo-600 rounded font-bold">← 뒤로</button>
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-sm text-slate-800">
          <h2 className="text-4xl font-black text-center mb-10">입장하기</h2>
          <input type="text" placeholder="코드" maxLength="4" className="w-full p-4 border-2 rounded-xl mb-4 text-center font-bold" value={roomCode} onChange={e=>setRoomCode(e.target.value)} />
          <input type="text" placeholder="이름" className="w-full p-4 border-2 rounded-xl mb-8 text-center font-bold" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} />
          <button onClick={join} className="w-full py-5 bg-amber-400 text-amber-900 rounded-xl font-black text-2xl shadow-md active:translate-y-1 transition-all">출발!</button>
        </div>
      </div>
    );
  }

  const currentScore = gameData.players && gameData.players[name] ? gameData.players[name].score : 0;
  const currentQuiz = gameData.quizList && gameData.quizList[gameData.currentIdx] ? gameData.quizList[gameData.currentIdx] : null;

  return (
    <div className="p-4 min-h-screen flex flex-col bg-slate-100 text-center">
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 flex justify-between items-center border-b-4 border-indigo-200">
        <span className="font-black text-slate-700">👤 {name}</span>
        <span className="font-black text-amber-500">⭐ {currentScore} pt</span>
      </div>

      {gameData.state === 'question' && currentQuiz && (
        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-white p-4 rounded-3xl shadow-md flex flex-col items-center border-2 border-slate-100 min-h-[120px] justify-center">
            <h2 className="text-xl font-black text-slate-800 break-keep">{currentQuiz.question}</h2>
            
            {/* 📸 [핵심 수정] 이미지 렌더링 부분 강화 */}
            {currentQuiz.image ? (
              <div className="mt-3 w-full flex justify-center">
                <img 
                  src={currentQuiz.image} 
                  alt="문제 사진" 
                  className="max-h-40 w-auto rounded-xl shadow-inner object-contain border border-slate-200"
                  onError={(e) => { e.target.style.display = 'none'; console.error('Image Load Error'); }}
                />
              </div>
            ) : (
              <div className="mt-2 text-[10px] text-slate-300">첨부된 사진 없음</div>
            )}
          </div>

          <div className={`${hasAnswered ? 'flex' : 'grid grid-cols-2'} flex-1 gap-3 mt-1`}>
            {hasAnswered ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-indigo-500 text-white rounded-3xl animate-pulse">
                <div className="text-5xl mb-4">⏳</div>
                <div className="text-2xl font-black">답안 제출 완료!<br/><span className="text-lg font-medium opacity-80">앞 화면을 보세요</span></div>
              </div>
            ) : (
              currentQuiz.options.map((opt, i) => (
                <button key={i} onClick={()=>sendAnswer(i)} className={`p-4 rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center ${['bg-red-500','bg-blue-500','bg-amber-400','bg-emerald-500'][i]}`}>
                  <span className="text-lg font-black text-white leading-tight break-all">{opt}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 대기/순위/결과 화면 생략 (기존 로직 유지) */}
      {gameData.state === 'waiting' && <div className="flex-1 flex items-center justify-center font-black text-slate-400 text-2xl">준비하시고...</div>}
      {gameData.state === 'scoreboard' && <div className="flex-1 flex items-center justify-center bg-amber-50 rounded-3xl text-2xl font-black text-amber-700">순위 확인 중! 👀</div>}
      {gameData.state === 'result' && <div className="flex-1 flex items-center justify-center bg-indigo-50 rounded-3xl text-2xl font-black text-indigo-700">과연 정답은?</div>}
      {gameData.state === 'final' && <div className="flex-1 flex items-center justify-center bg-amber-100 rounded-3xl text-3xl font-black text-amber-600">수고하셨습니다! 🏆</div>}
    </div>
  );
}
