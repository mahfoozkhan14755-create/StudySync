const socketIO = require('socket.io');

const initSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Join a specific Study Room
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Real-Time Chat Sync
    socket.on('send_message', (data) => {
      io.to(data.roomId).emit('receive_message', data);
    });

    // Real-Time Whiteboard Drawing Sync
    socket.on('draw', (data) => {
      socket.to(data.roomId).emit('draw', data);
    });

    // Clear Canvas Event
    socket.on('clear_canvas', (roomId) => {
      io.to(roomId).emit('clear_canvas');
    });

    socket.on('disconnect', () => {
      console.log(`User Disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initSocket;