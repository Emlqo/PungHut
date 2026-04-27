// src/App.jsx
import React, { useState } from 'react';
import HomeView from './components/HomeView';
import AdminAuth from './components/AdminAuth';
import AdminClassesView from './components/AdminClassesView';
import AdminClassDetailView from './components/AdminClassDetailView';
import GameHostView from './components/GameHostView';
import StudentView from './components/StudentView';

export default function App() {
  const [view, setView] = useState('home');
  const [selectedClassName, setSelectedClassName] = useState(null);
  const [activeRoomCode, setActiveRoomCode] = useState(null);

  return (
    <div className="min-h-screen">
      {view === 'home' && <HomeView onSelect={setView} />}
      {view === 'admin_auth' && <AdminAuth onSuccess={() => setView('admin_classes')} />}
      
      {view === 'admin_classes' && (
        <AdminClassesView 
          onSelectClass={(className) => {
            setSelectedClassName(className);
            setView('admin_class_detail');
          }} 
        />
      )}

      {view === 'admin_class_detail' && (
        <AdminClassDetailView 
          className={selectedClassName} 
          onBack={() => setView('admin_classes')}
          onStartSession={(code) => {
            setActiveRoomCode(code);
            setView('game_host');
          }}
        />
      )}

      {view === 'game_host' && (
        <GameHostView 
          roomCode={activeRoomCode} 
          onBack={() => setView('admin_classes')} 
        />
      )}

      {view === 'student' && <StudentView onBack={() => setView('home')} />}
    </div>
  );
}
