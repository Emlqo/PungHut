import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';

export default function AdminClassDetailView({ className, onBack, onStartSession }) {
  const [questions, setQuestions] = useState([]);
  // image(단일) 대신 images(배열)로 상태를 관리합니다.
  const [newQ, setNewQ] = useState({ question: '', images: [], options: ['', '', '', ''], answerIndex: 0 });

  useEffect(() => {
    const qRef = ref(db, `school_classes/${className}/questions`);
    const unsubscribe = onValue(qRef, snap => {
      const data = snap.val();
      if(data) setQuestions(Object.entries(data).map(([id, val]) => ({id, ...val})));
      else setQuestions([]);
    });
    return () => unsubscribe();
  }, [className]);

  // 여러 장의 사진을 텍스트(Base64) 배열로 변환해서 추가하는 함수
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    })).then(results => {
      setNewQ(prev => ({ ...prev, images: [...(prev.images || []), ...results] }));
    });
  };

  // 첨부한 사진 중 특정 사진만 취소하는 함수
  const removeNewImage = (idxToRemove) => {
    setNewQ(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== idxToRemove) }));
  };

  const saveQuestion = () => {
    if(!newQ.question) return alert('문제를 입력하세요');
    if(newQ.options.includes('')) return alert('4개의 보기를 모두 채워주세요!');
    
    push(ref(db, `school_classes/${className}/questions`), newQ)
      .then(() => setNewQ({ question: '', images: [], options: ['', '', '', ''], answerIndex: 0 }))
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
          
          <input type="text" placeholder="질문을 입력하세요" className="w-full p-3 border-2 rounded-lg mb-4 font-bold" value={newQ.question} onChange={e=>setNewQ({...newQ, question:e.target.value})} />
          
          {/* 다중 사진 업로드 영역 */}
          <div className="mb-4 p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50">
            <label className="block text-sm font-bold text-indigo-700 mb-2">📸 사진 첨부 (여러 장 가능)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="w-full text-sm" />
            
            {/* 여러 장 미리보기 */}
            {newQ.images && newQ.images.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {newQ.images.map((img, idx) => (
                  <div key={idx} className="relative shrink-0">
                    <img src={img} alt="미리보기" className="h-20 w-auto object-contain rounded-lg bg-white shadow-sm border" />
                    <button onClick={() => removeNewImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">X</button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
          {questions.map((q, idx) => {
            const displayImages = q.images || (q.image ? [q.image] : []);
            return (
              <div key={q.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border-l-8 border-indigo-400">
                <div className="flex-1 flex gap-4 items-center">
                  {/* 리스트 사진 표시 (첫 번째 사진만 작게 썸네일로) */}
                  {displayImages.length > 0 && (
                    <div className="relative">
                      <img src={displayImages[0]} className="w-16 h-16 object-cover rounded-lg shadow-sm border" />
                      {displayImages.length > 1 && (
                        <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-[10px] px-1 rounded-sm">+{displayImages.length - 1}</span>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg"><span className="text-indigo-500 mr-2">Q{idx+1}.</span>{q.question}</p>
                    <p className="text-sm text-green-600 mt-1">정답: {q.options[q.answerIndex]}</p>
                  </div>
                </div>
                <button onClick={()=>deleteQuestion(q.id)} className="text-red-500 font-bold bg-slate-50 px-4 py-2 rounded shadow-sm">삭제</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
