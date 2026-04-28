import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
// 🔥 update 함수 추가
import { ref, onValue, set, push, remove, update } from 'firebase/database';

export default function AdminClassDetailView({ className, onBack, onStartSession }) {
  const [questions, setQuestions] = useState([]);
  const [newQ, setNewQ] = useState({ question: '', images: [], options: ['', '', '', ''], answerIndex: 0 });
  
  // 🔥 현재 수정 중인 문제의 ID를 추적하는 상태
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const qRef = ref(db, `school_classes/${className}/questions`);
    const unsubscribe = onValue(qRef, snap => {
      const data = snap.val();
      if(data) setQuestions(Object.entries(data).map(([id, val]) => ({id, ...val})));
      else setQuestions([]);
    });
    return () => unsubscribe();
  }, [className]);

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

  const removeNewImage = (idxToRemove) => {
    setNewQ(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== idxToRemove) }));
  };

  // 🔥 [추가됨] 수정 버튼을 눌렀을 때 입력창으로 데이터를 불러오는 함수
  const startEdit = (q) => {
    setEditingId(q.id);
    // 과거(단일 image) 데이터도 완벽하게 호환되도록 처리
    const loadedImages = q.images || (q.image ? [q.image] : []);
    setNewQ({
      question: q.question || '',
      images: loadedImages,
      options: q.options || ['', '', '', ''],
      answerIndex: q.answerIndex !== undefined ? q.answerIndex : 0
    });
    // 스크롤을 맨 위 입력창으로 부드럽게 올려줌
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🔥 [추가됨] 수정을 취소하고 빈 칸으로 되돌리는 함수
  const cancelEdit = () => {
    setEditingId(null);
    setNewQ({ question: '', images: [], options: ['', '', '', ''], answerIndex: 0 });
  };

  const saveQuestion = () => {
    if(!newQ.question) return alert('문제를 입력하세요');
    if(newQ.options.includes('')) return alert('4개의 보기를 모두 채워주세요!');
    
    // 🔥 수정 모드일 때는 update, 새 문제일 때는 push를 사용
    if (editingId) {
      update(ref(db, `school_classes/${className}/questions/${editingId}`), newQ)
        .then(() => {
          alert('수정 완료!');
          cancelEdit();
        })
        .catch(e => alert('수정 실패: ' + e.message));
    } else {
      push(ref(db, `school_classes/${className}/questions`), newQ)
        .then(() => setNewQ({ question: '', images: [], options: ['', '', '', ''], answerIndex: 0 }))
        .catch(e => alert('저장 실패: ' + e.message));
    }
  };

  const deleteQuestion = (id) => {
    if(window.confirm('정말 이 문제를 삭제하시겠습니까?')) {
      remove(ref(db, `school_classes/${className}/questions/${id}`));
      // 만약 수정 중이던 문제를 삭제하면 입력창도 초기화
      if(editingId === id) cancelEdit();
    }
  };

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
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-md h-fit border-t-8 border-indigo-400">
          {/* 🔥 수정 모드에 따라 타이틀 색상 변경 */}
          <h3 className={`text-xl font-bold mb-4 ${editingId ? 'text-amber-600' : 'text-slate-800'}`}>
            {editingId ? '✏️ 문제 수정 중...' : '✨ 새 문제 추가'}
          </h3>
          
          <input type="text" placeholder="질문을 입력하세요" className="w-full p-3 border-2 rounded-lg mb-4 font-bold" value={newQ.question} onChange={e=>setNewQ({...newQ, question:e.target.value})} />
          
          <div className="mb-4 p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50">
            <label className="block text-sm font-bold text-indigo-700 mb-2">📸 사진 첨부 (여러 장 가능)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="w-full text-sm" />
            
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

          {/* 🔥 수정 모드일 때는 [수정 완료]와 [취소] 버튼 2개로 분리 */}
          {editingId ? (
            <div className="flex gap-2">
              <button onClick={saveQuestion} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 shadow-md">수정 완료</button>
              <button onClick={cancelEdit} className="w-24 py-3 bg-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-400">취소</button>
            </div>
          ) : (
            <button onClick={saveQuestion} className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 shadow-md">이 반에 문제 저장</button>
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xl font-bold mb-4">현재 저장된 문제 ({questions.length}개)</h3>
          {questions.map((q, idx) => {
            const displayImages = q.images || (q.image ? [q.image] : []);
            // 🔥 수정 중인 문제는 리스트에서 색상을 다르게 칠해서 표시해줍니다.
            const isEditing = editingId === q.id;

            return (
              <div key={q.id} className={`p-4 rounded-xl flex justify-between items-center shadow-sm border-l-8 transition-all ${isEditing ? 'bg-amber-50 border-amber-400 scale-[1.02]' : 'bg-white border-indigo-400'}`}>
                <div className="flex-1 flex gap-4 items-center">
                  {displayImages.length > 0 && (
                    <div className="relative">
                      <img src={displayImages[0]} className="w-16 h-16 object-cover rounded-lg shadow-sm border" />
                      {displayImages.length > 1 && (
                        <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-[10px] px-1 rounded-sm">+{displayImages.length - 1}</span>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg">
                      <span className={`${isEditing ? 'text-amber-600' : 'text-indigo-500'} mr-2`}>Q{idx+1}.</span>
                      {q.question}
                    </p>
                    <p className="text-sm text-green-600 mt-1">정답: {q.options[q.answerIndex]}</p>
                  </div>
                </div>
                
                {/* 🔥 수정 버튼 추가 */}
                <div className="flex gap-2">
                  <button onClick={()=>startEdit(q)} className="text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded shadow-sm transition">수정</button>
                  <button onClick={()=>deleteQuestion(q.id)} className="text-red-500 font-bold bg-red-50 hover:bg-red-100 px-4 py-2 rounded shadow-sm transition">삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
