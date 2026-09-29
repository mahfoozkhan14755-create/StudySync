import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Quiz from './Quiz';

const socket = io.connect('http://localhost:5000');

const StudyRoom = () => {
  const { roomId } = useParams();
  const { user, token } = useContext(AuthContext);

  // Chat States
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  // File Upload & Resource States
  const [resources, setResources] = useState([]);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // Canvas Drawing Refs & States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const prevCoords = useRef({ x: 0, y: 0 });

  const authHeader = {
    headers: {
      'x-auth-token': token,
      'Authorization': `Bearer ${token}`
    }
  };

  // --- FETCH RESOURCES ---
  const fetchResources = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/resources/${roomId}`, authHeader);
      setResources(res.data);
    } catch (err) {
      console.error('Failed to fetch resources');
    }
  };

  useEffect(() => {
    fetchResources();

    // Join Socket Room
    socket.emit('join_room', roomId);

    // Socket Listeners
    socket.on('receive_message', (data) => {
      setChatLog((prev) => [...prev, data]);
    });

    socket.on('draw', ({ x0, y0, x1, y1, color }) => {
      drawOnCanvas(x0, y0, x1, y1, color, false);
    });

    socket.on('clear_canvas', () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('draw');
      socket.off('clear_canvas');
    };
  }, [roomId]);

  // --- DRAWING LOGIC ---
  const drawOnCanvas = (x0, y0, x1, y1, strokeColor, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (emit) {
      socket.emit('draw', { roomId, x0, y0, x1, y1, color: strokeColor });
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    prevCoords.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    drawOnCanvas(prevCoords.current.x, prevCoords.current.y, currentX, currentY, color, true);
    prevCoords.current = { x: currentX, y: currentY };
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleClearCanvas = () => {
    socket.emit('clear_canvas', roomId);
  };

  // --- CHAT LOGIC ---
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const data = {
      roomId,
      sender: user?.name || 'Anonymous',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit('send_message', data);
    setMessage('');
  };

  // --- FILE UPLOAD LOGIC ---
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', roomId);

    try {
      await axios.post('http://localhost:5000/api/resources/upload', formData, {
        headers: {
          ...authHeader.headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadStatus('File uploaded successfully!');
      setFile(null);
      fetchResources();
    } catch (err) {
      setUploadStatus('File upload failed.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Study Room</h2>
      <p style={{ color: '#666' }}>Room ID: <b>{roomId}</b></p>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        
        {/* LEFT: WHITEBOARD CANVAS */}
        <div style={{ flex: 2, border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fafafa' }}>
          <h3>Collaborative Whiteboard</h3>
          <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>Color: </label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <button onClick={handleClearCanvas} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              Clear Canvas
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ border: '2px dashed #0284c7', background: '#ffffff', cursor: 'crosshair', borderRadius: '4px', width: '100%' }}
          />
        </div>

        {/* RIGHT: REAL-TIME CHAT */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '500px', background: '#fff' }}>
          <h3>Live Group Chat</h3>
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '10px', background: '#fafafa', borderRadius: '4px' }}>
            {chatLog.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>[{msg.time}] <b>{msg.sender}:</b></span>
                <p style={{ margin: '2px 0 0 0', fontSize: '14px' }}>{msg.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '5px' }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button type="submit" style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              Send
            </button>
          </form>
        </div>

      </div>

      {/* BOTTOM SECTION 1: RESOURCE SHARING */}
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fff' }}>
        <h3>Shared Resources & Notes</h3>
        {uploadStatus && <p style={{ color: uploadStatus.includes('failed') ? 'red' : 'green' }}>{uploadStatus}</p>}
        <form onSubmit={handleFileUpload} style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
          <button type="submit" style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Upload File
          </button>
        </form>

        <h4>Uploaded Files:</h4>
        {resources.length === 0 ? (
          <p style={{ color: '#888' }}>No resources shared yet.</p>
        ) : (
          <ul>
            {resources.map((res) => (
              <li key={res._id} style={{ marginBottom: '8px' }}>
                <a href={`http://localhost:5000/${res.filePath}`} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 'bold' }}>
                  {res.originalName}
                </a>
                <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                  (Uploaded by: {res.uploadedBy?.name || 'User'})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BOTTOM SECTION 2: QUIZZING ENGINE */}
      <Quiz groupId={roomId} />

    </div>
  );
};

export default StudyRoom;