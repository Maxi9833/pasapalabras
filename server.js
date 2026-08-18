const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Servir el archivo HTML automáticamente
app.use(express.static(__dirname));

let waitingPlayer = null;
let gameCounter = 1;

io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    // Cuando un jugador presiona "Buscar Partida"
    socket.on('join_game', (data) => {
        socket.playerName = data.name;

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // Se encontró un oponente, se crea la partida
            const gameId = `game_${gameCounter++}`;
            const players = {};
            players[waitingPlayer.id] = waitingPlayer.playerName;
            players[socket.id] = socket.playerName;

            // Unir a ambos a la misma sala
            waitingPlayer.join(gameId);
            socket.join(gameId);

            // Notificar que la partida inicia
            io.to(gameId).emit('start_match', { gameId, players });
            waitingPlayer = null;
        } else {
            // No hay nadie esperando, este jugador aguarda
            waitingPlayer = socket;
            socket.emit('waiting_for_opponent');
        }
    });

    // Sincronizar el puntaje en tiempo real
    socket.on('submit_answer', (data) => {
        socket.to(data.gameId).emit('player_progress', {
            score: data.score
        });
    });

    // Manejar desconexiones
    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

// Usar el puerto del servidor web o el 3000 local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Pasapalabra corriendo en el puerto ${PORT}`);
});