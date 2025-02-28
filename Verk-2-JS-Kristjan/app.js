const apiBaseUrl = 'http://localhost:3001/api/v1';

let currentSequence = [];
let playerSequence = [];

// Load game state from backend on page load
const loadGameState = async () => {
    try {
        const response = await fetch(`${apiBaseUrl}/game-state`);
        if (!response.ok) throw new Error("Failed to load game state");

        const data = await response.json();
        updateGameStateUI(data);
    } catch (error) {
        console.error("Error loading game state:", error);
    }
};

// Reset game state when page loads (or on game restart)
const resetGame = async () => {
    try {
        const response = await fetch(`${apiBaseUrl}/game-state`, { method: 'PUT' });
        if (!response.ok) throw new Error("Failed to reset game");

        const data = await response.json();
        updateGameStateUI(data.gameState);

        // Automatically show the new sequence
        await playSequence();
    } catch (error) {
        console.error("Error resetting game state:", error);
    }
};

// Send player input sequence to backend for validation
const validateSequence = async (playerSequence) => {
    try {
        const response = await fetch(`${apiBaseUrl}/game-state/sequence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence: playerSequence })
        });

        const data = await response.json();

        if (response.ok) {
            updateGameStateUI(data.gameState);

            // Automatically show the new sequence for the next level
            await playSequence();

            return true;
        } else {
            alert(data.message); // Show "Game Over" message or modal
            await resetGame();   // Reset game and show sequence for level 1
            return false;
        }
    } catch (error) {
        console.error("Error validating sequence:", error);
        return false;
    }
};

// Update the level and high score on screen
const updateGameStateUI = (gameState) => {
    document.getElementById('level-indicator').innerText = gameState.level;
    document.getElementById('high-score').innerText = gameState.highScore;
    currentSequence = gameState.sequence; // Save the new sequence from backend
    playerSequence = []; // Reset player sequence for next round
};

// Play the current sequence with lights and sounds (automatic on reset/level-up)
const playSequence = async () => {
    for (const color of currentSequence) {
        await highlightPad(color);
        await sleep(500); // 500ms between each color
    }
};

// Highlight pad (light up and play sound for each color)
const highlightPad = (color) => {
    return new Promise((resolve) => {
        const pad = document.getElementById(`pad-${color}`);
        pad.classList.add("active");
        playSound(colorToNote[color]);
        setTimeout(() => {
            pad.classList.remove("active");
            resolve();
        }, 500);
    });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

window.onload = async () => {
    await resetGame();
};

// --- Squares ---
let red_square = document.getElementById("pad-red");
let yellow_square = document.getElementById("pad-yellow");
let green_square = document.getElementById("pad-green");
let blue_square = document.getElementById("pad-blue");

// --- Synths ---
const synths = {
    sine: new Tone.Synth({ oscillator: { type: "sine" } }).toDestination(),
    square: new Tone.Synth({ oscillator: { type: "square" } }).toDestination(),
    triangle: new Tone.Synth({ oscillator: { type: "triangle" } }).toDestination(),
};

const synthTypes = ["sine", "square", "triangle"];
let index = 0;
let sound = synths[synthTypes[index]];

const soundSelect = document.getElementById("sound-select");
soundSelect.addEventListener("change", (event) => {
    const selectedSound = event.target.value;
    index = synthTypes.indexOf(selectedSound);
    sound = synths[selectedSound];
});

const colorToNote = {
    red: "C4",
    yellow: "D4",
    green: "E4",
    blue: "F4"
};

// Play sound and register player input
const handlePlayerInput = (color) => {
    playSound(colorToNote[color]);
    playerSequence.push(color);

    if (playerSequence.length === currentSequence.length) {
        validateSequence(playerSequence).then(success => {
            if (success) {
                playerSequence = [];
            }
        });
    }
};

// Play sound function
const playSound = (note) => {
    const now = Tone.now();
    sound.triggerAttackRelease(note, "4n", now);
};

// Assign button handlers
red_square.addEventListener("click", () => handlePlayerInput("red"));
yellow_square.addEventListener("click", () => handlePlayerInput("yellow"));
green_square.addEventListener("click", () => handlePlayerInput("green"));
blue_square.addEventListener("click", () => handlePlayerInput("blue"));

// --- Keyboard Input ---
document.addEventListener('click', () => {
    if (Tone.context.state !== 'running') {
        Tone.context.resume();
    }
}, { once: true });  // Run this handler only once


let pressed = {};

document.addEventListener("keydown", (event) => {
    if (pressed[event.key]) return;
    pressed[event.key] = true;

    switch (event.key.toLowerCase()) {
        case 'q':
            handlePlayerInput("red");
            red_square.focus();
            break;
        case 'w':
            handlePlayerInput("yellow");
            yellow_square.focus();
            break;
        case 'a':
            handlePlayerInput("green");
            green_square.focus();
            break;
        case 's':
            handlePlayerInput("blue");
            blue_square.focus();
            break;
    }
});

document.addEventListener("keyup", (event) => {
    pressed[event.key] = false;
});

// --- Replay Button (manual replay) ---
document.getElementById('replay-btn').addEventListener('click', playSequence);