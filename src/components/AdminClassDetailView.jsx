import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';

export default function AdminClassDetailView({ className, onBack, onStartSession }) {
  const [questions, setQuestions] = useState([]);
  // 이미지(image) 상태 추가
  const [newQ, setNewQ] = useState({ question: '', image: '', options: ['', '', '', ''], answerIndex: 0 });

  useEffect(() => {
    const qRef = ref(db, `school_classes/${className}/questions`);
    const unsubscribe = onValue(qRef, snap => {
      const data = snap.val();
      if(data) setQuestions(Object.entries(data).map(([id, val]) => ({id, ...val})));
      else setQuestions([]);
    });
    return () => unsubscribe();
  }, [className]);

  // 사진을 업로드하면 텍스트(Base64)로 변환해서 저장하는 함수
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewQ({ ...newQ, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const saveQuestion = () => {
    if(!newQ.question) return alert('문제를 입력하세요');
    if(newQ.options.includes('')) return alert('4개의 보기를 모두 채워주세요!');
    
    push(ref(db, `school_classes/${className}/questions`), newQ)
      .then(() => setNewQ({ question: '', image: '', options: ['', '', '', ''], answerIndex: 0 }))
      .catch(e => alert('저장 실패: ' + e.message));
  };

  const deleteQuestion = (id) => remove(ref(db, `school_classes/${className}/questions/${id}`));

  const openSession = () => {
    if(questions.length === 0) return alert('문제가 하나도 없습니다! 먼저 문제를 만들어주세요.');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    set(ref(db, 'active_sessions/' + code), {
      targetClass: className,
      state: 'waiting',
      isLocked: false,
      currentIdx: 0,
      quizList: questions,
      players: {}
    }).then(() => {
      onStartSession(code);
    }).catch(e => alert('방 생성 실패: ' + e.message));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b-4 border-indigo-100 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="px-4 py-2 bg-slate-200 rounded-lg font-bold">← 뒤로</button>
          <h2 className="text-4xl title-font text-indigo-700">{className} 문제함</h2>
        </div>
        <button onClick={openSession} className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-xl hover:bg-amber-600 transition animate-bounce">
          🚀 입장 시작하기 (방 열기)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-md h-fit">
          <h3 className="text-xl font-bold mb-4">새 문제 추가</h3>
          
          {/* 문제 입력 */}
          <input type="text" placeholder="질문을 입력하세요" className="w-full p-3 border-2 rounded-lg mb-4 font-bold" value={newQ.question} onChange={e=>setNewQ({...newQ, question:e.target.value})} />
          
          {/* 사진 업로드 영역 추가 */}
          <div className="mb-4 p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50">
            <label className="block text-sm font-bold text-indigo-700 mb-2">📸 사진 첨부 (선택)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm" />
            {newQ.image && <img src={newQ.image} alt="미리보기" className="mt-3 h-32 w-full object-contain rounded-lg bg-white shadow-sm" />}
          </div>

          {/* 보기 입력 */}
          <div className="space-y-2 mb-6">
            {newQ.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="ans" checked={newQ.answerIndex === i} onChange={()=>setNewQ({...newQ, answerIndex:i})} className="w-5 h-5 accent-indigo-500" />
                <input type="text" placeholder={`선택지 ${i+1}`} className="flex-1 p-2 border rounded" value={opt} onChange={e=>{
                  const copy = [...newQ.options];
                  copy[i] = e.target.value;
                  setNewQ({...newQ, options: copy});
                }} />
              </div>
            ))}
          </div>
          <button onClick={saveQuestion} className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 shadow-md">이 반에 문제 저장</button>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xl font-bold mb-4">현재 저장된 문제 ({questions.length}개)</h3>
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border-l-8 border-indigo-400">
              <div className="flex-1 flex gap-4 items-center">
                {/* 리스트에서도 사진이 있으면 작게 보여줌 */}
                {q.image && <img src={q.image} className="w-16 h-16 object-cover rounded-lg shadow-sm border" />}
                <div>
                  <p className="font-bold text-lg"><span className="text-indigo-500 mr-2">Q{idx+1}.</span>{q.question}</p>
                  <p className="text-sm text-green-600 mt-1">정답: {q.options[q.answerIndex]}</p>
                </div>
              </div>
              <button onClick={()=>deleteQuestion(q.id)} className="text-red-500 font-bold bg-slate-50 px-4 py-2 rounded shadow-sm">삭제</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
