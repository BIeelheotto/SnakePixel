let highScore = localStorage.getItem("snakeHighScore") || 0;

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const score = document.querySelector(".score--value");
const finalScore = document.querySelector(".final-score > span");
const menu = document.querySelector(".menu-screen");
const buttonPlay = document.querySelector(".btn-play");

const audio = new Audio("../assets/assets_audio.mp3");

const size = 30;
const initialPosition = { x: 270, y: 240 };

let snake = [initialPosition];
let direction;
let obstacles = [];
let lastRender = 0;
let speed = 300; // ms entre movimentos

// --- Score ---
const incrementScore = () => {
    score.innerText = +score.innerText + 10;
};

// --- Utilitários ---
const randomNumber = (min, max) => Math.round(Math.random() * (max - min) + min);

const randomPosition = () => {
    const number = randomNumber(0, canvas.width - size);
    return Math.round(number / size) * size;
};

const randomColor = () => {
    const r = randomNumber(50, 255);
    const g = randomNumber(50, 255);
    const b = randomNumber(50, 255);
    return `rgb(${r}, ${g}, ${b})`;
};

// --- Recorde ---
const saveHighScore = () => {
    if (+score.innerText > highScore) {
        highScore = +score.innerText;
        localStorage.setItem("snakeHighScore", highScore);
        const highScoreEl = document.querySelector(".high-score span");
        if (highScoreEl) highScoreEl.innerText = highScore;
    }
};
const highScoreEl = document.querySelector(".high-score span");
if (highScoreEl) highScoreEl.innerText = highScore;

// --- Comida ---
const food = {
    x: randomPosition(),
    y: randomPosition(),
    color: randomColor()
};

// --- Obstáculos ---
const generateObstacles = () => {
    obstacles = [];
    const currentScore = +score.innerText;

    if (currentScore > 0 && currentScore % 30 === 0) {
        for (let i = 0; i < 3; i++) {
            let x, y;
            do {
                x = randomPosition();
                y = randomPosition();
            } while (
                snake.some(p => p.x === x && p.y === y) ||
                (food.x === x && food.y === y)
            );
            obstacles.push({ x, y, w: size, h: size });
        }
    }
};

const drawObstacles = () => {
    ctx.fillStyle = "red";
    obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));
};

const checkObstacleCollision = () => {
    const head = snake[snake.length - 1];
    return obstacles.some(
        obs =>
            head.x < obs.x + obs.w &&
            head.x + size > obs.x &&
            head.y < obs.y + obs.h &&
            head.y + size > obs.y
    );
};

// --- Cobra ---
const drawSnake = () => {
    snake.forEach((pos, i) => {
        ctx.fillStyle = i === snake.length - 1 ? "white" : "#ddd";
        ctx.fillRect(pos.x, pos.y, size, size);
    });
};

const moveSnake = () => {
    if (!direction) return;
    const head = { ...snake[snake.length - 1] };

    if (direction === "right") head.x += size;
    if (direction === "left") head.x -= size;
    if (direction === "down") head.y += size;
    if (direction === "up") head.y -= size;

    snake.push(head);
    snake.shift();
};

// --- Grid ---
const drawGrid = () => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#191919";
    for (let i = size; i < canvas.width; i += size) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
};

// --- Comida ---
const drawFood = () => {
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = food.color;
    ctx.fillRect(food.x, food.y, size, size);
    ctx.shadowBlur = 0;
};

const checkEat = () => {
    const head = snake[snake.length - 1];
    if (head.x === food.x && head.y === food.y) {
        incrementScore();
        snake.push({ ...head });
        audio.play();

        let x, y;
        do {
            x = randomPosition();
            y = randomPosition();
        } while (
            snake.some(p => p.x === x && p.y === y) ||
            obstacles.some(obs => obs.x === x && obs.y === y)
        );

        food.x = x;
        food.y = y;
        food.color = randomColor();

        generateObstacles();
        updateSpeed();
    }
};

// --- Colisões ---
const checkCollision = () => {
    const head = snake[snake.length - 1];
    const canvasLimit = canvas.width - size;
    const wallCollision =
        head.x < 0 || head.x > canvasLimit || head.y < 0 || head.y > canvasLimit;

    const bodyCollision = snake.slice(0, -1).some(p => p.x === head.x && p.y === head.y);

    if (wallCollision || bodyCollision || checkObstacleCollision()) {
        gameOver();
    }
};

// --- Game Over ---
const gameOver = () => {
    direction = undefined;
    saveHighScore();
    menu.style.display = "flex";
    finalScore.innerHTML = `
        score <span>${score.innerText}</span><br>
        recorde <span>${highScore}</span>
    `;
    canvas.style.filter = "blur(2px)";
};

// --- Velocidade dinâmica ---
const updateSpeed = () => {
    const baseSpeed = 300;
    speed = Math.max(baseSpeed - snake.length * 5, 70);
};

// --- Loop ---
const gameLoop = (timestamp) => {
    if (!lastRender) lastRender = timestamp;
    const progress = timestamp - lastRender;

    if (progress > speed) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawFood();
        drawObstacles();
        moveSnake();
        drawSnake();
        checkEat();
        checkCollision();
        lastRender = timestamp;
    }

    requestAnimationFrame(gameLoop);
};

requestAnimationFrame(gameLoop);

// --- Controles ---
document.addEventListener("keydown", ({ key }) => {
    if (key === "ArrowRight" && direction !== "left") direction = "right";
    if (key === "ArrowLeft" && direction !== "right") direction = "left";
    if (key === "ArrowDown" && direction !== "up") direction = "down";
    if (key === "ArrowUp" && direction !== "down") direction = "up";
});

// --- Swipe ---
let startX, startY;
canvas.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", e => {
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && direction !== "left") direction = "right";
        else if (diffX < 0 && direction !== "right") direction = "left";
    } else {
        if (diffY > 0 && direction !== "up") direction = "down";
        else if (diffY < 0 && direction !== "down") direction = "up";
    }
}, { passive: true });

// --- Botão jogar novamente ---
buttonPlay.addEventListener("click", () => {
    score.innerText = "00";
    menu.style.display = "none";
    canvas.style.filter = "none";
    snake = [initialPosition];
    direction = undefined;
    obstacles = [];
    generateObstacles();
    updateSpeed();
});

