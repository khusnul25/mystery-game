const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } // Mengizinkan frontend Vercel mengakses server ini
});

let rooms = {}; // Menyimpan data tim aktif

io.on('connection', (socket) => {
    // Saat pemain membuat/bergabung tim
    socket.on('joinRoom', ({ code, isOwner }) => {
        socket.join(code);
        
        if (!rooms[code]) {
            rooms[code] = { owner: socket.id, players: [] };
        }
        
        // Tambahkan pemain ke daftar jika belum penuh
        if (rooms[code].players.length < 10) {
            rooms[code].players.push(socket.id);
        }

        // Kirim update jumlah pemain ke semua orang di tim tersebut
        io.to(code).emit('updatePlayers', rooms[code].players.length);
    });

    // Meneruskan chat ke semua anggota tim
    socket.on('sendMessage', ({ code, sender, message }) => {
        io.to(code).emit('newMessage', { sender, message });
    });

    // Pemicu mulai game dari Owner
    socket.on('startGameSignal', (code) => {
        io.to(code).emit('gameStarted');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
