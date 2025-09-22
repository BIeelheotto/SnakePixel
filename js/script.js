let highScore = localStorage.getItem("snakeHighScore") || 0;

const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")

const score = document.querySelector(".score--value")
const finalScore = document.querySelector(".final-score > span")
const menu = document.querySelector(".menu-screen")
const buttonPlay = document.querySelector(".btn-play")

const audio = new Audio("../assets/assets_audio.mp3")

const size = 30
const initialPosition = { x: 270, y: 240 }

let snake = [initialPosition]
let direction, loopId
let obstacles = []
let npcs = [] // cobrinhas inimigas
let inputQueue = [] // buffer para evitar travar movimentos rápidos

// --- SCORE ---
const incrementScore = () => {
    score.innerText = +score.innerText + 10
    const points = +score.innerText

    if (points % 30 === 0) {
        spawnObstacle()
        spawnNPC()
    }
}

// --- RANDOM ---
const randomNumber = (min, max) => {
    return Math.round(Math.random() * (max - min) + min)
}
const randomPosition = () => {
    const number = randomNumber(0, canvas.width - size)
    return Math.round(number / size) * size
}
const randomColor = () => {
    return `rgb(${randomNumber(50,200)},${randomNumber(50,200)},${randomNumber(50,200)})`
}

// --- RECORD ---
const saveHighScore = () => {
    if (+score.innerText > highScore) {
        highScore = +score.innerText;
        localStorage.setItem("snakeHighScore", highScore);
        const highScoreEl = document.querySelector(".high-score span");
        if (highScoreEl) highScoreEl.innerText = highScore;
    }
}
const highScoreEl = document.querySelector(".high-score span");
if (highScoreEl) highScoreEl.innerText = highScore;

// --- FOOD ---
const food = { x: randomPosition(), y: randomPosition(), color: randomColor() }

// --- OBSTÁCULOS ---
const spawnObstacle = () => {
    obstacles.push({
        x: randomPosition(),
        y: randomPosition(),
        w: size,
        h: size,
        color: "red"
    })
}
const drawObstacles = () => {
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h)
    })
}
const checkObstacleCollision = () => {
    const head = snake[snake.length - 1]
    obstacles.forEach(obs => {
        if (
            head.x < obs.x + obs.w &&
            head.x + size > obs.x &&
            head.y < obs.y + obs.h &&
            head.y + size > obs.y
        ) {
            gameOver()
        }
    })
}

// --- NPC COBRINHAS ---
const spawnNPC = () => {
    const npc = {
        body: [{ x: randomPosition(), y: randomPosition() }],
        dir: Math.random() > 0.5 ? "right" : "down",
        color: "orange"
    }
    npcs.push(npc)
}
const moveNPCs = () => {
    npcs.forEach(npc => {
        const head = npc.body[npc.body.length - 1]
        let newHead
        if (npc.dir === "right") newHead = { x: head.x + size, y: head.y }
        if (npc.dir === "down") newHead = { x: head.x, y: head.y + size }

        // volta se bater na parede
        if (newHead.x >= canvas.width || newHead.y >= canvas.height) {
            npc.dir = npc.dir === "right" ? "left" : "up"
            return
        }
        if (npc.dir === "left") newHead = { x: head.x - size, y: head.y }
        if (npc.dir === "up") newHead = { x: head.x, y: head.y - size }

        npc.body.push(newHead)
        if (npc.body.length > 5) npc.body.shift() // tamanho fixo
    })
}
const drawNPCs = () => {
    npcs.forEach(npc => {
        ctx.fillStyle = npc.color
        npc.body.forEach(part => {
            ctx.fillRect(part.x, part.y, size, size)
        })
    })
}
const checkNPCCollision = () => {
    const head = snake[snake.length - 1]
    for (let npc of npcs) {
        for (let part of npc.body) {
            if (head.x === part.x && head.y === part.y) {
                gameOver()
            }
        }
    }
}

// --- DRAW FOOD ---
const drawFood = () => {
    ctx.shadowColor = food.color
    ctx.shadowBlur = 6
    ctx.fillStyle = food.color
    ctx.fillRect(food.x, food.y, size, size)
    ctx.shadowBlur = 0
}

// --- DRAW SNAKE ---
const drawSnake = () => {
    ctx.fillStyle = "#ddd"
    snake.forEach((pos, i) => {
        ctx.fillStyle = i === snake.length - 1 ? "white" : "#ddd"
        ctx.fillRect(pos.x, pos.y, size, size)
    })
}

// --- MOVE SNAKE ---
const moveSnake = () => {
    if (!direction) return
    const head = snake[snake.length - 1]
    let newHead

    if (direction === "right") newHead = { x: head.x + size, y: head.y }
    if (direction === "left") newHead = { x: head.x - size, y: head.y }
    if (direction === "down") newHead = { x: head.x, y: head.y + size }
    if (direction === "up") newHead = { x: head.x, y: head.y - size }

    snake.push(newHead)
    snake.shift()
}

// --- GRID ---
const drawGrid = () => {
    ctx.lineWidth = 1
    ctx.strokeStyle = "#191919"
    for (let i = size; i < canvas.width; i += size) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, canvas.height)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(canvas.width, i)
        ctx.stroke()
    }
}

// --- EAT ---
const checkEat = () => {
    const head = snake[snake.length - 1]
    if (head.x === food.x && head.y === food.y) {
        incrementScore()
        snake.push({ ...head })
        audio.play()

        let x = randomPosition(), y = randomPosition()
        while (snake.find(p => p.x === x && p.y === y)) {
            x = randomPosition()
            y = randomPosition()
        }
        food.x = x
        food.y = y
        food.color = randomColor()
    }
}

// --- COLLISION ---
const checkCollision = () => {
    const head = snake[snake.length - 1]
    const canvasLimit = canvas.width - size
    const neckIndex = snake.length - 2

    const wallCollision =
        head.x < 0 || head.x > canvasLimit || head.y < 0 || head.y > canvasLimit
    const selfCollision = snake.find((pos, i) =>
        i < neckIndex && pos.x === head.x && pos.y === head.y
    )
    if (wallCollision || selfCollision) gameOver()
}

// --- GAME OVER ---
const gameOver = () => {
    direction = undefined
    saveHighScore()
    menu.style.display = "flex"
    finalScore.innerHTML = `
        score <span>${score.innerText}</span><br>
        recorde <span>${highScore}</span>
    `
    canvas.style.filter = "blur(2px)"
    clearInterval(loopId)
}

// --- SPEED ---
const getSpeed = () => {
    const baseSpeed = 200
    const speed = baseSpeed - (snake.length * 3)
    return Math.max(speed, 80)
}

// --- LOOP ---
const gameLoop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawGrid()
    drawFood()
    drawObstacles()
    drawNPCs()
    moveSnake()
    moveNPCs()
    drawSnake()
    checkEat()
    checkCollision()
    checkObstacleCollision()
    checkNPCCollision()
}

// --- START LOOP ---
loopId = setInterval(gameLoop, getSpeed())

// --- INPUTS ---
document.addEventListener("keydown", ({ key }) => {
    inputQueue.push(key)
})

// aplica input mais recente antes do frame
const inputHandler = () => {
    if (inputQueue.length) {
        const key = inputQueue.shift()
        if (key === "ArrowRight" && direction !== "left") direction = "right"
        if (key === "ArrowLeft" && direction !== "right") direction = "left"
        if (key === "ArrowDown" && direction !== "up") direction = "down"
        if (key === "ArrowUp" && direction !== "down") direction = "up"
    }
    requestAnimationFrame(inputHandler)
}
inputHandler()

// --- TOUCH CONTROLS ---
let startX, startY
canvas.addEventListener("touchstart", e => {
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
}, { passive: false })
canvas.addEventListener("touchend", e => {
    const touch = e.changedTouches[0]
    const diffX = touch.clientX - startX
    const diffY = touch.clientY - startY
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && direction !== "left") direction = "right"
        else if (diffX < 0 && direction !== "right") direction = "left"
    } else {
        if (diffY > 0 && direction !== "up") direction = "down"
        else if (diffY < 0 && direction !== "down") direction = "up"
    }
}, { passive: false })

// --- RESET GAME ---
buttonPlay.addEventListener("click", () => {
    score.innerText = "00"
    menu.style.display = "none"
    canvas.style.filter = "none"
    snake = [initialPosition]
    obstacles = []
    npcs = []
    direction = undefined
    clearInterval(loopId)
    loopId = setInterval(gameLoop, getSpeed())
})
