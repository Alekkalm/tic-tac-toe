const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Хранилище игр в памяти: roomId -> игра
const games = {};

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // строки
  [0,3,6],[1,4,7],[2,5,8], // столбцы
  [0,4,8],[2,4,6]          // диагонали
];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] };
    }
  }
  if (board.every(cell => cell !== null)) return { winner: 'draw' };
  return null;
}

io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  // Вход в комнату
  socket.on('join', (roomId) => {
    socket.join(roomId);

    if (!games[roomId]) {
      // Первый игрок создаёт игру
      games[roomId] = {
        board: Array(9).fill(null),
        players: [socket.id],
        turn: 'X',
        symbols: { [socket.id]: 'X' }
      };
      socket.emit('waiting'); // ждём второго
    } else {
      const game = games[roomId];
      if (game.players.length >= 2) {
        socket.emit('error-msg', 'Комната заполнена');
        return;
      }
      // Второй игрок
      game.players.push(socket.id);
      game.symbols[socket.id] = 'O';
      io.to(roomId).emit('start', {
        board: game.board,
        turn: game.turn
      });
    }
  });

  // Ход
  socket.on('move', ({ roomId, index }) => {
    const game = games[roomId];
    if (!game) return;

    // Проверки на сервере — это и есть "авторитетный сервер"
    const mySymbol = game.symbols[socket.id];
    if (!mySymbol) return;                       // не игрок этой комнаты
    if (mySymbol !== game.turn) return;          // не твой ход
    if (game.board[index] !== null) return;      // клетка занята

    // Применяем ход
    game.board[index] = mySymbol;
    const result = checkWinner(game.board);

    if (result) {
      io.to(roomId).emit('gameover', {
        board: game.board,
        ...result
      });
      delete games[roomId];
    } else {
      game.turn = game.turn === 'X' ? 'O' : 'X';
      io.to(roomId).emit('update', {
        board: game.board,
        turn: game.turn
      });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    for (const roomId in games) {
      const game = games[roomId];
      if (game.players.includes(socket.id)) {
        io.to(roomId).emit('opponent-left');
        delete games[roomId];
      }
    }
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Сервер запущен. Откройте в браузере адрес этого компьютера в локальной сети, порт 3000. Если на этом же компьютере - то можно так: http://localhost:3000');
});