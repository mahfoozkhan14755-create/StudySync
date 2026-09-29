import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');

  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createdRoomInfo, setCreatedRoomInfo] = useState(null); 
  const [activeRoom, setActiveRoom] = useState(null);

  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [files, setFiles] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [quiz, setQuiz] = useState(null);
  const [quizSubTab, setQuizSubTab] = useState('play'); 
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState('A');

  const [scores, setScores] = useState({});

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchRooms();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!activeRoom) return;

    socket.emit('join-room', { roomId: activeRoom.roomId, username: fullName });

    socket.on('load-room-data', (data) => {
      setMessages(data.messages || []);
      setFiles(data.files || []);
      setQuiz(data.quiz || null);
      setScores(data.scores || {});
    });

    socket.on('receive-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('receive-file', (file) => {
      setFiles((prev) => [...prev, file]);
    });

    socket.on('receive-quiz', (qData) => {
      setQuiz(qData ? { ...qData } : null);
    });

    socket.on('notification', (note) => {
      setNotifications((prev) => [...prev, note]);
    });

    socket.on('update-scores', (updatedScores) => {
      setScores(updatedScores);
    });

    socket.on('drawing', (data) => {
      drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, false);
    });

    socket.on('room-list-updated', (updatedRooms) => {
      setRooms(updatedRooms);
    });

    return () => {
      socket.off('load-room-data');
      socket.off('receive-message');
      socket.off('receive-file');
      socket.off('receive-quiz');
      socket.off('notification');
      socket.off('update-scores');
      socket.off('drawing');
      socket.off('room-list-updated');
    };
  }, [activeRoom, fullName]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/rooms');
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setRegisterSuccessMsg('');

    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const payload = authMode === 'login' 
      ? { email, password } 
      : { fullName, email, password };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (authMode === 'login') {
          setFullName(data.username);
          setIsLoggedIn(true);
        } else {
          setRegisterSuccessMsg('✨ Register Successfully! Please login now.');
          setAuthMode('login');
          setPassword('');
        }
      } else {
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError('Server connection failed!');
    }
  };

  const createStudyGroup = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch('http://localhost:5000/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: newRoomName, username: fullName })
      });
      const data = await res.json();
      if (data.success) {
        setNewRoomName('');
        setCreatedRoomInfo(data.room);
        fetchRooms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const joinGroupByCode = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCodeInput.trim()) return;
    
    const foundRoom = rooms.find(r => r.roomCode && r.roomCode.toUpperCase() === joinCodeInput.trim().toUpperCase());
    if (foundRoom) {
      setJoinCodeInput('');
      setActiveRoom(foundRoom);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: joinCodeInput })
      });
      const data = await res.json();
      if (data.success) {
        setJoinCodeInput('');
        setActiveRoom(data.room);
      } else {
        setJoinError('Invalid Room Code! Check code and try again.');
      }
    } catch (err) {
      setJoinError('Failed to join room!');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && activeRoom) {
      socket.emit('send-message', { roomId: activeRoom.roomId, message: messageInput, username: fullName });
      setMessageInput('');
    }
  };

  // --- Multer File Upload Handler ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeRoom) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', activeRoom.roomId);
    formData.append('username', fullName);

    try {
      const res = await fetch('http://localhost:5000/api/upload-file', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) {
        alert('File upload failed!');
      }
    } catch (err) {
      console.error('File upload error:', err);
    }
  };

  const handleCreateQuiz = (e) => {
    e.preventDefault();
    if (!questionText.trim() || !activeRoom) return;
    
    const quizData = {
      question: questionText,
      options: { A: optA, B: optB, C: optC, D: optD },
      correct: correctOpt,
      createdBy: fullName,
      submissions: {}
    };

    setQuiz(quizData);
    socket.emit('create-quiz', { roomId: activeRoom.roomId, quizData });

    setQuestionText('');
    setOptA(''); setOptB(''); setOptC(''); setOptD('');
    setQuizSubTab('play');
  };

  const handleAnswerSubmit = (optionKey) => {
    if (!activeRoom || !quiz) return;
    
    socket.emit('submit-quiz-answer', { roomId: activeRoom.roomId, username: fullName, selectedOption: optionKey });

    if (optionKey === quiz.correct) {
      const updatedScores = { ...scores, [fullName]: (scores[fullName] || 0) + 10 };
      setScores(updatedScores);
      socket.emit('update-leaderboard', { roomId: activeRoom.roomId, scores: updatedScores });
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    canvasRef.current.lastX = e.clientX - rect.left;
    canvasRef.current.lastY = e.clientY - rect.top;
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawOnCanvas(canvas.lastX, canvas.lastY, x, y, '#6366f1', true);
    canvas.lastX = x;
    canvas.lastY = y;
  };

  const stopDrawing = () => setIsDrawing(false);

  const drawOnCanvas = (x0, y0, x1, y1, color, emit) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();

    if (emit && activeRoom) {
      socket.emit('drawing', { roomId: activeRoom.roomId, data: { x0, y0, x1, y1, color } });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
        <div className="bg-white/15 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md text-white">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-pink-400 to-indigo-300 bg-clip-text text-transparent">StudySync</h1>
            <p className="text-sm text-purple-200 mt-2">Collaborative Virtual Classroom & Study Hub</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/10">
            <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setRegisterSuccessMsg(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${authMode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-purple-300'}`}>Login</button>
            <button type="button" onClick={() => { setAuthMode('register'); setAuthError(''); setRegisterSuccessMsg(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${authMode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-purple-300'}`}>Register</button>
          </div>

          {registerSuccessMsg && (
            <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl mb-4 text-xs text-center font-medium">
              {registerSuccessMsg}
            </div>
          )}

          {authError && <div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 p-3 rounded-xl mb-4 text-xs text-center">{authError}</div>}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-purple-300 font-semibold mb-2">Full Name</label>
                <input type="text" placeholder="Enter full name..." value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl focus:outline-none focus:border-pink-500 text-white placeholder-purple-400 text-sm" required />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-purple-300 font-semibold mb-2">Email Address</label>
              <input type="email" placeholder="Enter email..." value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl focus:outline-none focus:border-pink-500 text-white placeholder-purple-400 text-sm" required />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-purple-300 font-semibold mb-2">Password</label>
              <input type="password" placeholder="Enter password..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl focus:outline-none focus:border-pink-500 text-white placeholder-purple-400 text-sm" required />
            </div>
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-indigo-600 rounded-xl font-bold tracking-wide shadow-lg hover:opacity-95 transition transform active:scale-95 text-sm">
              {authMode === 'login' ? 'Login to Portal 🚀' : 'Create Account ✨'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (activeRoom) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg">
          <div className="flex items-center space-x-4">
            <button onClick={() => setActiveRoom(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition">← Back to Dashboard</button>
            <h2 className="text-xl font-black bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent">Group: {activeRoom.roomName}</h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Code: <b className="text-pink-400 tracking-wider">{activeRoom.roomCode}</b></span>
          </div>
          <div className="flex space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>💬 Live Chat</button>
            <button onClick={() => setActiveTab('whiteboard')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'whiteboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🎨 Whiteboard</button>
            <button onClick={() => setActiveTab('files')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📁 Files</button>
            <button onClick={() => setActiveTab('quiz')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📝 Quiz Hub</button>
            <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🏆 Leaderboard</button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col">
          {notifications.length > 0 && (
            <div className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 px-4 py-2 rounded-xl mb-4 text-xs animate-pulse">
              🔔 {notifications[notifications.length - 1]}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col ${m.username === fullName ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-400 mb-1 px-1">{m.username} • {m.time}</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-md text-sm ${m.username === fullName ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}`}>
                      {m.message}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
                <input type="text" placeholder="Type a message to group..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500 text-sm" />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold text-sm shadow transition">Send</button>
              </form>
            </div>
          )}

          {activeTab === 'whiteboard' && (
            <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800">
              <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800">Collaborative Whiteboard — Real-time syncing for all members!</div>
              <canvas ref={canvasRef} width={900} height={500} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} className="w-full flex-1 cursor-crosshair bg-white" />
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-indigo-400">Study Group Shared Materials</h3>
                  <p className="text-xs text-slate-400">Upload documents, notes, or assignment files for all group members.</p>
                </div>
                <label className="cursor-pointer bg-gradient-to-r from-pink-500 to-indigo-600 hover:opacity-95 px-5 py-2.5 rounded-xl font-bold text-xs shadow transition flex items-center gap-2">
                  <span>📤 Upload Document</span>
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-500 text-sm mb-2">No files shared yet in this group.</p>
                    <p className="text-xs text-slate-600">Click the 'Upload Document' button above to add files.</p>
                  </div>
                ) : (
                  files.map((f, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-sm text-indigo-200">📄 {f.fileName}</p>
                        <p className="text-xs text-slate-500">Shared by {f.username} at {f.time}</p>
                      </div>
                      <a href={f.fileData} download={f.fileName} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition shadow">Download</a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-indigo-400">📝 Live Group Quiz Hub</h3>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setQuizSubTab('play')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${quizSubTab === 'play' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🎮 Play Active Quiz</button>
                  <button onClick={() => setQuizSubTab('create')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${quizSubTab === 'create' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>✏️ Create New Quiz</button>
                </div>
              </div>

              {quizSubTab === 'create' ? (
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 max-w-xl mx-auto w-full my-auto">
                  <h4 className="text-sm font-bold text-pink-400 mb-4">Create a New Quiz Question</h4>
                  <form onSubmit={handleCreateQuiz} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Question</label>
                      <input type="text" placeholder="e.g. What is the capital of France?" value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Option A" value={optA} onChange={(e) => setOptA(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" required />
                      <input type="text" placeholder="Option B" value={optB} onChange={(e) => setOptB(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" required />
                      <input type="text" placeholder="Option C" value={optC} onChange={(e) => setOptC(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" required />
                      <input type="text" placeholder="Option D" value={optD} onChange={(e) => setOptD(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" required />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Correct Option</label>
                      <select value={correctOpt} onChange={(e) => setCorrectOpt(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-pink-500 to-indigo-600 rounded-xl font-bold text-sm shadow">Publish Quiz 🚀</button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center">
                  {!quiz ? (
                    <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 max-w-md w-full text-center">
                      <p className="text-slate-400 text-sm mb-4">No active quiz is currently running in this group.</p>
                      <button onClick={() => setQuizSubTab('create')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition shadow">Create a Quiz Now ✏️</button>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-6 rounded-xl border border-indigo-500/30 max-w-2xl mx-auto w-full shadow-2xl">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Active Quiz by <b>{quiz.createdBy}</b></span>
                        <button onClick={() => setQuiz(null)} className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition">Delete Quiz 🗑️</button>
                      </div>
                      <h4 className="text-base font-bold text-white mb-4">❓ {quiz.question}</h4>
                      
                      <div className="grid grid-cols-1 gap-3 mb-6">
                        {Object.entries(quiz.options).map(([key, val]) => {
                          const isMyAnswer = quiz.submissions && quiz.submissions[fullName] === key;
                          return (
                            <button key={key} onClick={() => handleAnswerSubmit(key)} className={`p-3.5 rounded-xl text-left text-sm font-semibold border transition flex justify-between items-center ${isMyAnswer ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-indigo-500'}`}>
                              <span><b>{key}.</b> {val}</span>
                              {isMyAnswer && <span className="text-xs bg-black/30 px-2.5 py-1 rounded">Your Answer ✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <h5 className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-3">Live Submissions ({Object.keys(quiz.submissions || {}).length} Members Answered)</h5>
                        <div className="space-y-2">
                          {Object.keys(quiz.submissions || {}).length === 0 ? (
                            <p className="text-xs text-slate-500">No answers submitted yet. Be the first to answer!</p>
                          ) : (
                            Object.entries(quiz.submissions).map(([user, ans]) => {
                              const isCorrect = ans === quiz.correct;
                              return (
                                <div key={user} className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-lg text-xs">
                                  <span className="font-semibold text-slate-300">{user}</span>
                                  <span className={`px-2 py-0.5 rounded font-bold ${isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                                    Choice: {ans} {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <h3 className="text-lg font-bold text-indigo-400 mb-2">🏆 Group Leaderboard</h3>
              <p className="text-xs text-slate-400 mb-6">Real-time ranking of study group members based on quiz activities.</p>

              <div className="flex-1 overflow-y-auto space-y-3 max-w-xl mx-auto w-full">
                {Object.keys(scores).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-800 rounded-xl text-center">
                    <p className="text-slate-500 text-sm mb-1">No scores recorded yet!</p>
                    <p className="text-xs text-slate-600">Play and answer correct quizzes to top the leaderboard.</p>
                  </div>
                ) : (
                  Object.entries(scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([username, score], index) => (
                      <div key={username} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : index === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40' : index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' : 'bg-slate-800 text-slate-400'}`}>
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-sm text-white">{username} {username === fullName && '(You)'}</span>
                        </div>
                        <span className="text-indigo-400 font-bold text-sm bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">{score} pts</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl mb-8">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent">Welcome, {fullName}! 👋</h1>
            <p className="text-xs text-slate-400 mt-1">Create a new study group, enter via code, or join from available rooms below.</p>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="px-4 py-2 bg-rose-600/25 hover:bg-rose-600/35 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition">Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4">Create New Study Group</h2>
              <form onSubmit={createStudyGroup} className="space-y-4">
                <input type="text" placeholder="Enter Group Name..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm" required />
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-pink-500 to-indigo-600 rounded-xl font-bold text-sm shadow transition">Create Group 🚀</button>
              </form>
            </div>

            {createdRoomInfo && (
              <div className="mt-4 bg-indigo-950/80 border border-indigo-500/40 p-4 rounded-xl text-center">
                <p className="text-xs text-indigo-300 font-semibold mb-1">✨ Group Created Successfully!</p>
                <p className="text-xs text-slate-400 mb-2">Share this code with friends to join:</p>
                <div className="bg-black/50 py-2 px-4 rounded-lg text-lg font-mono tracking-widest text-pink-400 font-bold border border-indigo-500/30 inline-block mb-3">
                  {createdRoomInfo.roomCode}
                </div>
                <div>
                  <button onClick={() => setActiveRoom(createdRoomInfo)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold shadow">Enter Group Now ➔</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400 mb-4">Enter Group via Code</h2>
              <form onSubmit={joinGroupByCode} className="space-y-4">
                <input type="text" placeholder="Enter 6-digit Code (e.g. A3F8K9)..." value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white uppercase focus:outline-none focus:border-pink-500 text-sm" required />
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-500 rounded-xl font-bold text-sm shadow transition">Enter Group 🔑</button>
              </form>
            </div>
            {joinError && <div className="mt-4 bg-rose-500/20 border border-rose-500/40 text-rose-200 p-3 rounded-xl text-xs text-center">{joinError}</div>}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4">Available Class Rooms ({rooms.length})</h2>
          {rooms.length === 0 ? (
            <p className="text-slate-500 text-sm">No active rooms found. Create a new study group above!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((r) => (
                <div key={r.roomId} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex justify-between items-center hover:border-indigo-500/50 transition">
                  <div>
                    <h3 className="font-bold text-base text-white">{r.roomName}</h3>
                    <p className="text-xs text-slate-400 mt-1">Host: {r.createdBy} • Code: <span className="text-pink-400 font-mono font-bold tracking-wider">{r.roomCode}</span></p>
                  </div>
                  <button onClick={() => setActiveRoom(r)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold shadow transition">Join Room</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;