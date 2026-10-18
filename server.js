const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Allow file uploads up to 10MB through Socket.io
const io = new Server(server, {
  maxHttpBufferSize: 1e7 // 10 MB
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Track connected users: socket.id -> username
const users = new Map();

io.on('connection', (socket) => {
  // Handle user joining
  socket.on('join', (rawUsername) => {
    const username = (rawUsername || '').trim() || 'Anonymous';
    users.set(socket.id, username);

    // Broadcast updated user count
    io.emit('userCount', users.size);

    // Broadcast system message to all clients
    io.emit('systemMessage', {
      text: `${username} joined the chat`,
      time: getCurrentTime()
    });
  });

  // Handle chat text messages
  socket.on('chatMessage', (text) => {
    const username = users.get(socket.id) || 'Anonymous';
    const trimmedText = (text || '').trim();
    if (!trimmedText) return;

    io.emit('chatMessage', {
      user: username,
      text: trimmedText,
      time: getCurrentTime()
    });
  });

  // Handle file & image messages
  socket.on('fileMessage', (data) => {
    const username = users.get(socket.id) || 'Anonymous';
    if (!data || !data.fileData) return;

    io.emit('fileMessage', {
      user: username,
      fileName: data.fileName || 'file',
      fileType: data.fileType || '',
      fileData: data.fileData, // base64 data URI
      time: getCurrentTime()
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      io.emit('userCount', users.size);
      io.emit('systemMessage', {
        text: `${username} left the chat`,
        time: getCurrentTime()
      });
    }
  });
});

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
