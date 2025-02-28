const synths = {
    sine:     new Tone.Synth({ oscillator: { type: "sine"     } }).toDestination(),
    square:   new Tone.Synth({ oscillator: { type: "square"   } }).toDestination(),
    triangle: new Tone.Synth({ oscillator: { type: "triangle" } }).toDestination()
};

let sound = synths.sine;
let gameState = { 
    sequence: [], 
    playerSequence: [], 
    level: 1, 
    highScore: 0 
};

const fetchGameState = async () => {
    const response = await axios.get('http://localhost:3001/api/v1/game-state');
    gameState = { ...gameState, ...response.data };
    document.getElementById('level-indicator').innerText = gameState.level;
    document.getElementById('high-score').innerText = gameState.highScore;
    document.getElementById('replay-btn').disabled = true;
};

const flashPad = async (color) => {
    const pad = document.getElementById(`pad-${color}`);
    pad.classList.add('active');

    const note = { red: "C4", yellow: "D4", green: "E4", blue: "F4" }[color];
    sound.triggerAttackRelease(note, "8n");

    await new Promise(resolve => setTimeout(resolve, 400));
    pad.classList.remove('active');
};

const playSequence = async () => {
    document.getElementById('replay-btn').disabled = true;

    for (const color of gameState.sequence) {
        await flashPad(color);
        await new Promise(resolve => setTimeout(resolve, 600));
    }

    document.getElementById('replay-btn').disabled = false;
};

const handlePadPress = (color) => {
    document.getElementById('replay-btn').disabled = true;
    gameState.playerSequence.push(color);
    flashPad(color);
    if (gameState.playerSequence.length === gameState.sequence.length) {
        validateSequence();
    }
};

const validateSequence = async () => {
    try {
        const response = await axios.post('http://localhost:3001/api/v1/game-state/sequence', {
            sequence: gameState.playerSequence
        });

        if (response.status === 200) {
            gameState = { ...gameState, ...response.data.gameState };
            document.getElementById('level-indicator').innerText = gameState.level;
            document.getElementById('high-score').innerText = gameState.highScore;
            gameState.playerSequence = [];
            setTimeout(playSequence, 1000);
        }
    } catch {
        document.getElementById('failure-modal').style.display = 'flex';
    }
};

const soundSelect = document.getElementById("sound-select");
soundSelect.addEventListener("change", (event) => {
    sound = synths[event.target.value];
});

const colorMap = { 'q': 'red', 'w': 'yellow', 'a': 'green', 's': 'blue' };
document.addEventListener('keydown', (event) => {
    const color = colorMap[event.key.toLowerCase()];
    if (color) handlePadPress(color);
});

document.getElementById('start-btn').addEventListener('click', async () => {
    await fetchGameState();
    playSequence();
});

document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('failure-modal').style.display = 'none';
    fetchGameState().then(playSequence);
});

document.getElementById('replay-btn').addEventListener('click', playSequence);