import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, update, get } from 'firebase/database';

export default function StudentView({ onBack }) {
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [gameData, setGameData] = useState({ state: 'waiting' });
  const [hasAnswered, setHasAnswered] = useState(false);

// src/components/StudentView.jsx 의 join 함수를 이걸로 교체하세요!

  const join = async () => {
    if(!roomCode || !name) return alert('클래스 코드와 닉네임을 모두 입력해주세요!');
    try {
      const snap = await get(ref(db, 'active_sessions/' + roomCode));
      const data = snap.val();
      if(!data) return alert('존재하지 않는 코드입니다!');
      
      // 🔥 [핵심 수정] 이미 참여했던 이력이 있는 학생인지 확인
      const isExistingPlayer = data.players && data.players[name];

      // 방이 잠겨있는데, 처음 온 학생이라면 차단! (튕겨서 재접속하는 학생은 자비롭게 통과)
      if(data.isLocked && !isExistingPlayer) {
        return alert('입장이 마감되었습니다! 선생님께 문의하세요.');
      }

      // 새로운 학생일 경우에만 점수를 0점으로 초기화 (기존 학생은 DB 점수 보존)
      if (!isExistingPlayer) {
        await update(ref(db, 'active_sessions/' + roomCode + '/players'), { 
          [name]: { score: 0, answer: null } 
        });
      }

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
  const quizImages = currentQuiz ? (currentQuiz.images || (currentQuiz.image ? [currentQuiz.image] : [])) : [];

  return (
    <div className="p-4 min-h-screen flex flex-col bg-slate-100 text-center">
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 flex justify-between items-center border-b-4 border-indigo-200 shrink-0">
        <span className="font-black text-slate-700">👤 {name}</span>
        <span className="font-black text-amber-500">⭐ {currentScore} pt</span>
      </div>

      {gameData.state === 'question' && currentQuiz && (
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          <div className="bg-white p-4 rounded-3xl shadow-md flex flex-col items-center border-2 border-slate-100 shrink-0 max-h-[50%] overflow-y-auto">
            <h2 className="text-xl font-black text-slate-800 break-keep mb-2">{currentQuiz.question}</h2>
            
            {/* 📸 여러 장 사진 스크롤 영역 */}
            {quizImages.length > 0 && (
              <div className="flex gap-2 w-full overflow-x-auto pb-2 snap-x">
                {quizImages.map((img, idx) => (
                  <img key={idx} src={img} className="max-h-32 md:max-h-40 w-auto rounded-xl shadow-sm object-contain border border-slate-200 shrink-0 snap-center" alt={`문제사진 ${idx+1}`} />
                ))}
              </div>
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

      {gameData.state === 'waiting' && <div className="flex-1 flex items-center justify-center font-black text-slate-400 text-2xl">준비하시고...</div>}
      {gameData.state === 'scoreboard' && <div className="flex-1 flex items-center justify-center bg-amber-50 rounded-3xl text-2xl font-black text-amber-700">순위 확인 중! 👀</div>}
      {gameData.state === 'result' && <div className="flex-1 flex items-center justify-center bg-indigo-50 rounded-3xl text-2xl font-black text-indigo-700">과연 정답은?</div>}
      {gameData.state === 'final' && <div className="flex-1 flex items-center justify-center bg-amber-100 rounded-3xl text-3xl font-black text-amber-600">수고하셨습니다! 🏆</div>}
    </div>
  );
}
