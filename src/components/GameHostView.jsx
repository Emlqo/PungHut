import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, update, remove, onDisconnect } from 'firebase/database';

export default function GameHostView({ roomCode, onBack }) {
  const [roomData, setRoomData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const roomRef = ref(db, 'active_sessions/' + roomCode);
    onDisconnect(roomRef).remove();
    const unsubscribe = onValue(roomRef, snap => setRoomData(snap.val()));
    return () => {
      unsubscribe();
      onDisconnect(roomRef).cancel();
    };
  }, [roomCode]);

  useEffect(() => {
    let timer;
    if (roomData && roomData.state === 'question' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (roomData && roomData.state === 'question' && timeLeft === 0) {
      showResult();
    }
    return () => clearInterval(timer);
  }, [roomData ? roomData.state : null, timeLeft]);

  if(!roomData) return <div className="p-20 text-center text-2xl font-bold">방 정보를 불러오는 중...</div>;

  const toggleLock = () => update(ref(db, 'active_sessions/' + roomCode), { isLocked: !roomData.isLocked });
  const startGame = () => update(ref(db, 'active_sessions/' + roomCode), { state: 'question', startTime: Date.now(), isLocked: true });

  // 🔥 [핵심 수정] 캐시 안 지워진 학생도 무조건 점수가 오르는 하이브리드 계산기!
  const showResult = () => {
    const currentQ = roomData.quizList[roomData.currentIdx];
    const updates = {};
    updates['active_sessions/' + roomCode + '/state'] = 'result';
    
    if(roomData.players) {
      Object.entries(roomData.players).forEach(([name, p]) => {
        if (p.answer === currentQ.answerIndex) {
          let timeTakenSec = 15; // 기본값 (네트워크 지연 시 중간 점수 부여)

          // 1. 완벽하게 업데이트된 최신 학생 폰 (timeTakenMs)
          if (p.timeTakenMs !== undefined) {
            timeTakenSec = p.timeTakenMs / 1000;
          } 
          // 2. 끈질긴 캐시 때문에 옛날 데이터를 보내는 학생 폰 (answerTime)
          else if (p.answerTime && p.questionStartTime) {
            timeTakenSec = (p.answerTime - p.questionStartTime) / 1000;
          }

          let scoreAdd = Math.round((1 - timeTakenSec / 30) * 1000);
          
          // 철통 방어 가드레일 (기기 간 시간차로 인해 점수가 미쳐 날뛰어도 무조건 0~1000점 고정!)
          if (scoreAdd < 0) scoreAdd = 0;
          if (scoreAdd > 1000) scoreAdd = 1000;

          updates['active_sessions/' + roomCode + '/players/' + name + '/score'] = (p.score || 0) + scoreAdd;
        }
        
        // 다음 문제를 위해 데이터 초기화
        updates['active_sessions/' + roomCode + '/players/' + name + '/answer'] = null;
        updates['active_sessions/' + roomCode + '/players/' + name + '/timeTakenMs'] = null;
        updates['active_sessions/' + roomCode + '/players/' + name + '/answerTime'] = null; 
      });
    }
    update(ref(db), updates);
  };

  const showScoreboard = () => update(ref(db, 'active_sessions/' + roomCode), { state: 'scoreboard' });
  const nextQuestion = () => {
    if(roomData.currentIdx + 1 < roomData.quizList.length) {
      setTimeLeft(30);
      update(ref(db, 'active_sessions/' + roomCode), { state: 'question', currentIdx: roomData.currentIdx + 1, startTime: Date.now() });
    } else {
      update(ref(db, 'active_sessions/' + roomCode), { state: 'final' });
    }
  };

  const closeSession = () => {
    if(window.confirm('게임을 완전히 종료하시겠습니까?')) {
      remove(ref(db, 'active_sessions/' + roomCode));
      onBack();
    }
  };

  const playersList = roomData.players ? Object.keys(roomData.players) : [];
  const sortedPlayers = roomData.players ? Object.entries(roomData.players).sort((a, b) => (b[1].score || 0) - (a[1].score || 0)) : [];
  const currentQuiz = roomData.state !== 'waiting' && roomData.state !== 'final' ? roomData.quizList[roomData.currentIdx] : null;
  const quizImages = currentQuiz ? (currentQuiz.images || (currentQuiz.image ? [currentQuiz.image] : [])) : [];

  return (
    <div className="p-8 text-center min-h-screen bg-slate-100 relative overflow-hidden flex flex-col">
      <button onClick={closeSession} className="absolute top-8 left-8 px-4 py-2 bg-red-500 text-white rounded font-bold shadow-lg z-50">방폭파/종료</button>
      
      {roomData.state === 'waiting' && (
        <div className="mt-10">
          <h2 className="text-3xl mb-4 font-bold text-slate-600">[{roomData.targetClass}] 입장 코드</h2>
          <div className="text-9xl title-font text-indigo-600 mb-8 drop-shadow-xl animate-pulse">{roomCode}</div>
          <button onClick={toggleLock} className={`mb-10 px-8 py-4 rounded-full text-xl font-bold shadow-md transition ${roomData.isLocked ? 'bg-red-500 text-white' : 'bg-white text-indigo-700 border-2 border-indigo-200'}`}>
            {roomData.isLocked ? '🔒 입장 마감됨' : '🔓 입장 중 (클릭 시 마감)'}
          </button>
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-4xl mx-auto border-t-8 border-indigo-500">
            <h3 className="text-2xl font-bold mb-6">참여 중인 학생: {playersList.length}명</h3>
            <div className="flex flex-wrap gap-4 justify-center min-h-[100px]">
              {playersList.map(name => <span key={name} className="px-6 py-3 bg-indigo-100 rounded-full font-bold text-xl text-indigo-800 shadow-sm animate-bounce">{name}</span>)}
            </div>
            <button onClick={startGame} className="mt-12 px-20 py-5 bg-indigo-600 text-white rounded-2xl text-3xl font-black shadow-lg hover:scale-105 transition transform">게임 시작!</button>
          </div>
        </div>
      )}

      {roomData.state === 'question' && (
        <div className="max-w-5xl mx-auto mt-4 flex-1 flex flex-col justify-center w-full">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <span className="text-5xl font-black text-red-500 bg-white px-8 py-4 rounded-full shadow-lg border-4 border-red-100">{timeLeft}s</span>
            <span className="text-3xl font-bold bg-indigo-200 px-6 py-2 rounded-full text-indigo-800">Q {roomData.currentIdx + 1} / {roomData.quizList.length}</span>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-xl mb-6 flex-1 flex flex-col justify-center">
            <h2 className="text-5xl font-black mb-6 leading-tight">{currentQuiz.question}</h2>
            {quizImages.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {quizImages.map((img, idx) => (
                  <img key={idx} src={img} className="max-h-60 rounded-2xl shadow-md object-contain border-4 border-slate-50" alt={`문제사진 ${idx+1}`} />
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-6 h-48 shrink-0">
            {currentQuiz.options.map((opt, i) => (
              <div key={i} className={`flex items-center justify-center text-4xl font-bold text-white rounded-2xl shadow-xl ${['bg-red-500','bg-blue-500','bg-amber-400','bg-emerald-500'][i]}`}>{opt}</div>
            ))}
          </div>
          <button onClick={showResult} className="mt-8 px-8 py-3 bg-slate-800 text-white rounded-xl font-bold shadow-md hover:bg-slate-700 transition mx-auto block shrink-0">
            시간 건너뛰기
          </button>
        </div>
      )}

      {roomData.state === 'result' && (
        <div className="mt-20">
          <h2 className="text-4xl font-bold mb-6 text-slate-500 italic">정답은 과연...?</h2>
          <div className="text-7xl font-black text-green-600 mb-12 bg-white inline-block px-16 py-8 rounded-3xl shadow-2xl border-b-8 border-green-200">{currentQuiz.options[currentQuiz.answerIndex]}</div>
          <div><button onClick={showScoreboard} className="px-12 py-6 bg-indigo-600 text-white rounded-full text-3xl font-bold shadow-xl hover:scale-105 transition transform">순위 확인하기 📊</button></div>
        </div>
      )}

      {roomData.state === 'scoreboard' && (
        <div className="max-w-4xl mx-auto mt-10 w-full">
          <h2 className="text-5xl font-black text-indigo-700 mb-10 title-font">현재 순위 🚩</h2>
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {sortedPlayers.slice(0, 5).map(([name, p], i) => (
              <div key={name} className={`flex justify-between items-center p-6 border-b last:border-0 ${i === 0 ? 'bg-amber-50' : ''}`}>
                <div className="flex items-center gap-6">
                  <span className={`text-4xl font-black ${i === 0 ? 'text-amber-500' : 'text-slate-300'}`}>{i + 1}</span>
                  <span className="text-3xl font-bold text-slate-800">{name}</span>
                </div>
                <span className="text-3xl font-black text-indigo-600">{p.score || 0} pt</span>
              </div>
            ))}
          </div>
          <button onClick={nextQuestion} className="mt-12 px-16 py-6 bg-amber-500 text-white rounded-full text-3xl font-black shadow-xl hover:scale-105 transition transform">
             {roomData.currentIdx + 1 < roomData.quizList.length ? '다음 문제로!' : '최종 순위 발표! 🏆'}
          </button>
        </div>
      )}

      {roomData.state === 'final' && (
        <div className="h-screen flex flex-col items-center justify-end pb-20 overflow-hidden w-full">
          <h2 className="text-7xl title-font text-amber-500 mb-20 drop-shadow-lg animate-bounce">CONGRATULATIONS! 🎉</h2>
          <div className="flex items-end gap-4 w-full max-w-5xl h-[500px]">
            {sortedPlayers[1] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-3xl font-black mb-4 truncate w-full px-2 text-slate-600">{sortedPlayers[1][0]}</div>
                <div className="w-full bg-slate-300 rounded-t-3xl shadow-2xl flex flex-col items-center pt-8 animate-[slideUp_1s_ease-out]" style={{ height: '60%' }}><span className="text-7xl font-black text-white opacity-50">2</span><span className="mt-4 text-2xl font-bold text-slate-700">{sortedPlayers[1][1].score} pt</span></div>
              </div>
            )}
            {sortedPlayers[0] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-5xl mb-4 animate-bounce text-amber-400">👑</div>
                <div className="text-4xl font-black mb-4 truncate w-full px-2 text-indigo-800">{sortedPlayers[0][0]}</div>
                <div className="w-full bg-amber-400 rounded-t-3xl shadow-2xl flex flex-col items-center pt-8 border-x-4 border-t-4 border-amber-200 animate-[slideUp_0.7s_ease-out]" style={{ height: '90%' }}><span className="text-9xl font-black text-white opacity-60">1</span><span className="mt-4 text-3xl font-black text-amber-900">{sortedPlayers[0][1].score} pt</span></div>
              </div>
            )}
            {sortedPlayers[2] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-3xl font-black mb-4 truncate w-full px-2 text-orange-700">{sortedPlayers[2][0]}</div>
                <div className="w-full bg-orange-300 rounded-t-3xl shadow-2xl flex flex-col items-center pt-8 animate-[slideUp_1.3s_ease-out]" style={{ height: '40%' }}><span className="text-7xl font-black text-white opacity-50">3</span><span className="mt-4 text-2xl font-bold text-orange-900">{sortedPlayers[2][1].score} pt</span></div>
              </div>
            )}
          </div>
          <button onClick={() => window.location.reload()} className="mt-16 text-slate-400 font-bold underline hover:text-slate-600">처음으로 돌아가기</button>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
