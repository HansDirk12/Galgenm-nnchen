// Verbindung zum Server
const socket = io('https://galgenmännchen.onrender.com');

// DOM Elemente
const menu = document.getElementById('menu');
const game = document.getElementById('game');
const wordInput = document.getElementById('wordInput');
const gameOver = document.getElementById('gameOver');
const createGameBtn = document.getElementById('createGame');
const joinGameBtn = document.getElementById('joinGame');
const submitWordBtn = document.getElementById('submitWord');
const playerNameInput = document.getElementById('playerName');
const joinCodeInput = document.getElementById('joinCode');
const secretWordInput = document.getElementById('secretWord');
const gameCodeDisplay = document.getElementById('codeDisplay');
const gameCodeContainer = document.getElementById('gameCode');
const wordContainer = document.getElementById('wordContainer');
const usedLetters = document.getElementById('usedLetters');
const keyboard = document.getElementById('keyboard');
const canvas = document.getElementById('hangmanCanvas');
const ctx = canvas.getContext('2d');

// Spielzustand
let gameState = {
    gameCode: null,
    isWordGiver: false,
    secretWord: '',
    guessedLetters: new Set(),
    wrongGuesses: 0,
    maxWrongGuesses: 6
};

// Event Listeners
createGameBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        socket.emit('createGame', playerName);
        gameState.isWordGiver = true;
    }
});

joinGameBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const gameCode = joinCodeInput.value.trim();
    if (playerName && gameCode) {
        socket.emit('joinGame', { playerName, gameCode });
    }
});

submitWordBtn.addEventListener('click', () => {
    const word = secretWordInput.value.trim().toUpperCase();
    if (isValidWord(word)) {
        socket.emit('submitWord', { word, gameCode: gameState.gameCode });
        gameState.secretWord = word;
        wordInput.classList.remove('active');
        game.classList.add('active');
        displayWord();
    } else {
        alert('Bitte gib ein gültiges Wort ein (nur Buchstaben)');
    }
});

keyboard.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && !gameState.isWordGiver) {
        const letter = e.target.dataset.letter;
        if (!gameState.guessedLetters.has(letter)) {
            socket.emit('guessLetter', { 
                letter, 
                gameCode: gameState.gameCode 
            });
            e.target.disabled = true;
        }
    }
});

// Socket Events
socket.on('gameCreated', (gameCode) => {
    gameState.gameCode = gameCode;
    gameCodeDisplay.textContent = gameCode;
    gameCodeContainer.classList.remove('hidden');
    menu.classList.remove('active');
    wordInput.classList.add('active');
});

socket.on('gameJoined', (data) => {
    menu.classList.remove('active');
    if (!gameState.isWordGiver) {
        game.classList.add('active');
    }
    document.getElementById('player1Name').textContent = data.wordGiver;
    document.getElementById('player2Name').textContent = data.guesser;
});

socket.on('startGame', (data) => {
    if (!gameState.isWordGiver) {
        gameState.secretWord = '_'.repeat(data.wordLength);
        displayWord();
    }
});

socket.on('guessResult', (data) => {
    gameState.guessedLetters.add(data.letter);
    
    if (!data.correct) {
        gameState.wrongGuesses++;
        drawHangman(gameState.wrongGuesses);
    }
    
    if (!gameState.isWordGiver) {
        updateWordDisplay(data.positions, data.letter);
    }
    
    updateUsedLetters();
    
    if (data.gameOver) {
        endGame(data.won);
    }
});

// Hilfsfunktionen
function isValidWord(word) {
    return /^[A-ZÄÖÜß]+$/.test(word);
}

function displayWord() {
    if (gameState.isWordGiver) {
        wordContainer.textContent = gameState.secretWord;
    } else {
        wordContainer.textContent = gameState.secretWord.split('').map(char => 
            gameState.guessedLetters.has(char) ? char : '_'
        ).join(' ');
    }
}

function updateWordDisplay(positions, letter) {
    const wordArray = gameState.secretWord.split('');
    positions.forEach(pos => {
        wordArray[pos] = letter;
    });
    gameState.secretWord = wordArray.join('');
    displayWord();
}

function updateUsedLetters() {
    usedLetters.textContent = 'Benutzte Buchstaben: ' + 
        Array.from(gameState.guessedLetters).join(', ');
}

function drawHangman(wrongGuesses) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    switch(wrongGuesses) {
        case 1: // Galgen
            ctx.beginPath();
            ctx.moveTo(50, 200);
            ctx.lineTo(150, 200);
            ctx.moveTo(100, 200);
            ctx.lineTo(100, 50);
            ctx.lineTo(150, 50);
            ctx.lineTo(150, 75);
            ctx.stroke();
            break;
            
        case 2: // Kopf
            ctx.beginPath();
            ctx.arc(150, 90, 15, 0, Math.PI * 2);
            ctx.stroke();
            break;
            
        case 3: // Körper
            ctx.beginPath();
            ctx.moveTo(150, 105);
            ctx.lineTo(150, 150);
            ctx.stroke();
            break;
            
        case 4: // Linker Arm
            ctx.beginPath();
            ctx.moveTo(150, 120);
            ctx.lineTo(130, 140);
            ctx.stroke();
            break;
            
        case 5: // Rechter Arm
            ctx.beginPath();
            ctx.moveTo(150, 120);
            ctx.lineTo(170, 140);
            ctx.stroke();
            break;
            
        case 6: // Beine
            ctx.beginPath();
            ctx.moveTo(150, 150);
            ctx.lineTo(130, 180);
            ctx.moveTo(150, 150);
            ctx.lineTo(170, 180);
            ctx.stroke();
            break;
    }
}

function endGame(won) {
    game.classList.remove('active');
    gameOver.classList.add('active');
    
    const gameResult = document.getElementById('gameResult');
    const revealWord = document.getElementById('revealWord');
    
    if (gameState.isWordGiver) {
        gameResult.textContent = won ? 
            'Dein Wort wurde erraten!' : 
            'Dein Wort wurde nicht erraten!';
    } else {
        gameResult.textContent = won ? 
            'Gratulation! Du hast das Wort erraten!' : 
            'Schade! Du hast das Wort nicht erraten.';
    }
    
    revealWord.textContent = `Das Wort war: ${gameState.secretWord}`;
}

// Spiel neu starten
document.getElementById('playAgain').addEventListener('click', () => {
    location.reload();
}); 