const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Statische Dateien werden nicht mehr benötigt, da diese auf Netlify liegen
// app.use(express.static('./'));

const games = new Map();

function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('Ein Spieler hat sich verbunden');

    socket.on('createGame', (playerName) => {
        const gameCode = generateGameCode();
        games.set(gameCode, {
            wordGiver: {
                id: socket.id,
                name: playerName
            },
            guesser: null,
            word: null,
            guessedLetters: new Set(),
            wrongGuesses: 0
        });
        
        socket.join(gameCode);
        socket.emit('gameCreated', gameCode);
        console.log(`Neues Spiel erstellt: ${gameCode}`);
    });

    socket.on('joinGame', ({ playerName, gameCode }) => {
        const game = games.get(gameCode);
        
        if (!game) {
            socket.emit('error', 'Spiel nicht gefunden');
            return;
        }

        if (game.guesser) {
            socket.emit('error', 'Spiel ist bereits voll');
            return;
        }

        game.guesser = {
            id: socket.id,
            name: playerName
        };

        socket.join(gameCode);
        io.to(gameCode).emit('gameJoined', {
            wordGiver: game.wordGiver.name,
            guesser: game.guesser.name
        });
        
        console.log(`Spieler ist Spiel beigetreten: ${gameCode}`);
    });

    socket.on('submitWord', ({ word, gameCode }) => {
        const game = games.get(gameCode);
        if (!game) return;

        game.word = word;
        socket.to(gameCode).emit('startGame', {
            wordLength: word.length
        });
    });

    socket.on('guessLetter', ({ letter, gameCode }) => {
        const game = games.get(gameCode);
        if (!game || !game.word) return;

        game.guessedLetters.add(letter);
        
        const positions = [];
        for (let i = 0; i < game.word.length; i++) {
            if (game.word[i] === letter) {
                positions.push(i);
            }
        }
        
        const correct = positions.length > 0;
        if (!correct) {
            game.wrongGuesses++;
        }

        const allLettersGuessed = game.word
            .split('')
            .every(char => game.guessedLetters.has(char));

        const gameOver = allLettersGuessed || game.wrongGuesses >= 6;
        const won = allLettersGuessed;

        io.to(gameCode).emit('guessResult', {
            letter,
            positions,
            correct,
            gameOver,
            won
        });
    });

    socket.on('disconnect', () => {
        console.log('Ein Spieler hat die Verbindung getrennt');
        for (const [gameCode, game] of games.entries()) {
            if (game.wordGiver?.id === socket.id || game.guesser?.id === socket.id) {
                io.to(gameCode).emit('playerDisconnected');
                games.delete(gameCode);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
}); 