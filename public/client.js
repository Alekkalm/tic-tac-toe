const socket = io();
let mySymbol = null;
let currentTurn = null;
let roomId = null;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

// Создаём 9 клеток
for (let i = 0; i < 9; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.index = i;
  cell.addEventListener('click', () => makeMove(i));
  boardEl.appendChild(cell);
}

function renderBoard(board) {
  document.querySelectorAll('.cell').forEach((cell, i) => {
    cell.textContent = board[i] || '';
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function join() {
  roomId = document.getElementById('room').value.trim();
  if (!roomId) return;
  socket.emit('join', roomId);
  setStatus('Подключение к комнате ' + roomId + '...');
}

function makeMove(index) {
  if (!roomId) return;
  socket.emit('move', { roomId, index });
}

// --- События от сервера ---

socket.on('waiting', () => {
  setStatus('Ожидаем второго игрока...');
});

socket.on('start', ({ board, turn }) => {
  // Первый игрок уже знает, что он X; второй — O
  mySymbol = mySymbol || 'X'; // уточним ниже через update
  currentTurn = turn;
  renderBoard(board);
  setStatus('Игра началась! Ход: ' + turn);
});

socket.on('update', ({ board, turn }) => {
  currentTurn = turn;
  renderBoard(board);
  setStatus('Ход: ' + turn);
});

socket.on('gameover', ({ board, winner, line }) => {
  renderBoard(board);
  if (winner === 'draw') {
    setStatus('Ничья!');
  } else {
    // Подсветим выигрышную линию
    line.forEach(i => {
      document.querySelectorAll('.cell')[i].style.background = '#b8f0b8';
    });
    setStatus('Победили ' + winner + '!');
  }
});

socket.on('opponent-left', () => {
  setStatus('Соперник вышел. Обновите страницу.');
});

socket.on('error-msg', (msg) => {
  setStatus('Ошибка: ' + msg);
});