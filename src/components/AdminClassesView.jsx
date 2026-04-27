import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';

export default function AdminClassesView({ onSelectClass }) {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    const classesRef = ref(db, 'school_classes');
    const unsubscribe = onValue(classesRef, (snap) => {
      const data = snap.val() || {};
      setClasses(Object.keys(data));
    });
    return () => unsubscribe(); // 정리 함수
  }, []);

  const createClass = () => {
    if(!newClassName.trim()) return alert('반 이름을 입력하세요! (예: 1학년 7반)');
    set(ref(db, 'school_classes/' + newClassName), {
      createdAt: Date.now()
    }).then(() => {
      setNewClassName('');
    }).catch(e => alert('DB 저장 에러: ' + e.message));
  };

  const deleteClass = (name) => {
    if(window.confirm(`[${name}] 반을 삭제하시겠습니까? (저장된 문제도 날아갑니다)`)) {
      remove(ref(db, 'school_classes/' + name));
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-4xl title-font text-indigo-700 mb-8">내 클래스 관리</h2>
      
      <div className="bg-white p-6 rounded-2xl shadow-md mb-8 flex gap-4">
        <input 
          type="text" placeholder="새로운 반 이름 입력 (예: 1학년 7반)" 
          className="flex-1 p-4 border-2 rounded-xl font-bold text-xl"
          value={newClassName} onChange={e => setNewClassName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createClass()}
        />
        <button onClick={createClass} className="px-8 bg-green-500 text-white font-bold text-xl rounded-xl hover:bg-green-600">반 개설</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.length === 0 && <div className="text-slate-500">개설된 반이 없습니다. 먼저 반을 만드세요.</div>}
        {classes.map(name => (
          <div key={name} className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 flex justify-between items-center shadow-sm">
            <span className="text-2xl font-black text-slate-800">{name}</span>
            <div className="flex gap-2">
              <button onClick={() => onSelectClass(name)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">문제 관리</button>
              <button onClick={() => deleteClass(name)} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
