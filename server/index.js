const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Uploads Directory
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes Integration
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/resources', require('./routes/resources'));

// Socket.io Real-Time Logic
io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  // Join Room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Send & Receive Chat Messages
  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);
  });

  // Collaborative Whiteboard Drawing Coordinates
  socket.on('draw', (data) => {
    socket.to(data.roomId).emit('draw', data);
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
  });
});

// Database Connection & Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully!');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
  });