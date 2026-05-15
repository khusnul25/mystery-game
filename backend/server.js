const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } // Mengizinkan domain Vercel/Netlify mengakses socket
});

let rooms = {}; 

io.on('connection', (socket) => {

    socket.on('joinRoom', ({ code, isOwner }) => {
        socket.join(code);

        // Jika kamar belum terdaftar di memori server, buat objek baru
        if (!rooms[code]) {
            rooms[code] = { owner: socket.id, players: [], chosenRiddles: [] };
        }

        // Batasi maksimal pemain adalah 10 orang dalam satu tim
        if (rooms[code].players.length >= 10) {
            socket.emit('newMessage', { sender: "SISTEM", message: "Kamar sudah penuh! Maksimal 10 orang." });
            return;
        }

        rooms[code].players.push(socket.id);
        const playerOrder = rooms[code].players.length; // Menentukan urutan player (1 s/d 10)

        // Kirim info nomor urut player ke client yang bersangkutan
        socket.emit('playerAssigned', playerOrder);

        // Update jumlah pemain terbaru ke seluruh anggota tim
        io.to(code).emit('updatePlayers', rooms[code].players.length);
    });

    // Memproses permintaan mulai game manual dari Owner
    socket.on('requestStart', (code) => {
        if (rooms[code] && rooms[code].players.length >= 4) {
            // Acak 5 teka-teki dari total 6 database teka-teki yang tersedia
            let indexes = [];
            while(indexes.length < 5) {
                let r = Math.floor(Math.random() * 6); // Acak index 0 sampai 5
                if(!indexes.includes(r)) indexes.push(r);
            }
            rooms[code].chosenRiddles = indexes;
            
            // Kirim daftar teka-teki terpilih ke seluruh tim untuk mulai bermain
            io.to(code).emit('gameInit', rooms[code].chosenRiddles);
        }
    });

    // Meneruskan pesan chat diskusi ke seluruh anggota tim
    socket.on('sendMessage', ({ code, sender, message }) => {
        io.to(code).emit('newMessage', { sender, message });
    });

    // Sinkronisasi jika salah satu pemain menjawab dengan benar, seluruh tim maju ke level berikutnya
    socket.on('correctAnswerSubmitted', (code) => {
        io.to(code).emit('nextLevel');
    });

    // Menghapus data player dari kamar jika terputus/close browser
    socket.on('disconnect', () => {
        for (let code in rooms) {
            let index = rooms[code].players.indexOf(socket.id);
            if (index !== -1) {
                rooms[code].players.splice(index, 1);
                io.to(code).emit('updatePlayers', rooms[code].players.length);
                if (rooms[code].players.length === 0) {
                    delete rooms[code]; // Hapus room jika kosong total
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server Detektif berjalan sempurna di port ${PORT}`);
});
