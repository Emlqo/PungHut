import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, update, remove } from 'firebase/database';

export default function GameHostView({ roomCode, onBack }) {
  const [roomData, setRoomData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const roomRef = ref(db, 'active_sessions/' + roomCode);
    const unsubscribe = onValue(roomRef, snap => setRoomData(snap.val()));
    return () => unsubscribe();
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

  const toggleLock = () => {
    update(ref(db, 'active_sessions/' + roomCode), { isLocked: !roomData.isLocked });
  };

  const startGame = () => {
    update(ref(db, 'active_sessions/' + roomCode), { state: 'question', startTime: Date.now(), isLocked: true });
  };

  const showResult = () => {
    const currentQ = roomData.quizList[roomData.currentIdx];
    const updates = {};
    updates['active_sessions/' + roomCode + '/state'] = 'result';
    
    if(roomData.players) {
      Object.entries(roomData.players).forEach(([name, p]) => {
        if (p.answer === currentQ.answerIndex && p.answerTime) {
          const timeTaken = (p.answerTime - p.questionStartTime) / 1000;
          const scoreAdd = Math.max(0, Math.round((1 - timeTaken / 30) * 1000));
          updates['active_sessions/' + roomCode + '/players/' + name + '/score'] = (p.score || 0) + scoreAdd;
        }
        updates['active_sessions/' + roomCode + '/players/' + name + '/answer'] = null;
      });
    }
    update(ref(db), updates);
  };

  const nextQuestion = () => {
    if(roomData.currentIdx + 1 < roomData.quizList.length) {
      setTimeLeft(30);
      update(ref(db, 'active_sessions/' + roomCode), { state: 'question', currentIdx: roomData.currentIdx + 1, startTime: Date.now() });
    } else {
      update(ref(db, 'active_sessions/' + roomCode), { state: 'final' });
    }
  };

  const closeSession = () => {
    if(window.confirm('게임을 완전히 종료하고 대기실로 돌아가시겠습니까?')) {
      remove(ref(db, 'active_sessions/' + roomCode));
      onBack();
    }
  };

  const playersList = roomData.players ? Object.keys(roomData.players) : [];

  return (
    <div className="p-8 text-center min-h-screen bg-slate-100 relative">
      <button onClick={closeSession} className="absolute top-8 left-8 px-4 py-2 bg-red-500 text-white rounded font-bold shadow">방폭파/종료</button>
      
      {roomData.state === 'waiting' && (
        <div className="mt-10">
          <h2 className="text-3xl mb-4 font-bold text-slate-600">[{roomData.targetClass}] 학생들, 아래 코드로 입장하세요!</h2>
          <div className="text-9xl title-font text-indigo-600 mb-8 drop-shadow-xl">{roomCode}</div>
          
          <div className="mb-10">
            <button onClick={toggleLock} className={`px-8 py-4 rounded-full text-xl font-bold shadow-md transition ${roomData.isLocked ? 'bg-red-500 text-white' : 'bg-white text-indigo-700 border-2 border-indigo-200'}`}>
              {roomData.isLocked ? '🔒 현재 입장 불가능 (잠김)' : '🔓 입장 허용 중 (여기를 눌러 잠금)'}
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-4xl mx-auto border-t-8 border-indigo-500">
            <h3 className="text-2xl font-bold mb-6">현재 접속 명단 ({playersList.length}명)</h3>
            <div className="flex flex-wrap gap-4 justify-center min-h-[100px]">
              {playersList.length === 0 && <span className="text-gray-400 mt-4">입장을 기다리고 있습니다...</span>}
              {playersList.map(name => <span key={name} className="px-6 py-3 bg-indigo-100 rounded-full font-bold text-xl text-indigo-800 shadow-sm">{name}</span>)}
            </div>
            <button onClick={startGame} className="mt-12 px-20 py-5 bg-indigo-600 text-white rounded-2xl text-3xl font-black shadow-lg hover:bg-indigo-700">문제 풀이 시작!</button>
          </div>
        </div>
      )}

      {roomData.state === 'question' && (
        <div className="max-w-5xl mx-auto mt-10">
          <div className="flex justify-between items-center mb-8">
            <span className="text-5xl font-black text-red-500 bg-white px-8 py-4 rounded-full shadow-lg">{timeLeft}초</span>
            <span className="text-3xl font-bold bg-indigo-200 px-6 py-2 rounded-full text-indigo-800">Q {roomData.currentIdx + 1}</span>
          </div>
          <h2 className="text-5xl font-black bg-white p-12 rounded-3xl shadow-xl mb-10">{roomData.quizList[roomData.currentIdx].question}</h2>
          <div className="grid grid-cols-2 gap-6 h-64">
            {roomData.quizList[roomData.currentIdx].options.map((opt, i) => (
              <div key={i} className={`flex items-center justify-center text-4xl font-bold text-white rounded-2xl shadow-xl ${['bg-red-500','bg-blue-500','bg-amber-400','bg-emerald-500'][i]}`}>
                {opt}
              </div>
            ))}
          </div>
          <button onClick={showResult} className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold">강제 스킵</button>
        </div>
      )}

      {roomData.state === 'result' && (
        <div className="mt-20">
          <h2 className="text-4xl font-bold mb-6 text-slate-600">정답!</h2>
          <div className="text-7xl font-black text-green-600 mb-16 bg-white inline-block px-12 py-6 rounded-3xl shadow-xl">
            {roomData.quizList[roomData.currentIdx].options[roomData.quizList[roomData.currentIdx].answerIndex]}
          </div>
          <div>
            <button onClick={nextQuestion} className="px-16 py-6 bg-indigo-600 text-white rounded-full text-3xl font-bold shadow-xl">
              {roomData.currentIdx + 1 < roomData.quizList.length ? '다음 문제' : '최종 결과 확인'}
            </button>
          </div>
        </div>
      )}

      {roomData.state === 'final' && (
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-6xl title-font text-amber-500 mb-10">최종 순위표</h2>
          <div className="space-y-4">
            {playersList.length > 0 ? (
              Object.entries(roomData.players)
                .sort((a,b)=> (b[1].score||0) - (a[1].score||0))
                .map(([name, p], i) => (
                  <div key={name} className={`flex justify-between items-center p-6 rounded-2xl text-3xl font-black shadow ${i===0?'bg-amber-300 scale-105 z-10':i===1?'bg-slate-300':i===2?'bg-orange-300':'bg-white'}`}>
                    <span>{i+1}등 {name}</span>
                    <span>{p.score || 0} pt</span>
                  </div>
                ))
            ) : (
              <div className="text-3xl font-bold text-gray-500">참여자가 없습니다.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
