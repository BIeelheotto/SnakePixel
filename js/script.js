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

const incrementScore = () => {
    score.innerText = +score.innerText + 10
}

// --- Funções utilitárias ---
const randomNumber = (min, max) => {
    return Math.round(Math.random() * (max - min) + min)
}

const randomPosition = () => {
    const number = randomNumber(0, canvas.width - size)
    return Math.round(number / 30) * 30
}

const randomColor = () => {
    const red = randomNumber(0, 255)
    const green = randomNumber(0, 255)
    const blue = randomNumber(0, 255)

    return `rgb(${red}, ${green}, ${blue})`
}

// --- Função para salvar recorde ---
const saveHighScore = () => {
    if (+score.innerText > highScore) {
        highScore = +score.innerText;
        localStorage.setItem("snakeHighScore", highScore);

        // atualiza se o elemento existir no HTML
        const highScoreEl = document.querySelector(".high-score span");
        if (highScoreEl) {
            highScoreEl.innerText = highScore;
        }
    }
}

// --- Inicializa o recorde na tela (se tiver no HTML) ---
const highScoreEl = document.querySelector(".high-score span");
if (highScoreEl) {
    highScoreEl.innerText = highScore;
}

// --- Objeto da comida ---
const food = {
    x: randomPosition(),
    y: randomPosition(),
    color: randomColor()
}

let direction, loopId

// --- Desenhar comida ---
const drawFood = () => {
    const { x, y, color } = food

    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
    ctx.shadowBlur = 0
}

// --- Desenhar cobra ---
const drawSnake = () => {
    ctx.fillStyle = "#ddd"

    snake.forEach((position, index) => {
        if (index == snake.length - 1) {
            ctx.fillStyle = "white"
        }
        ctx.fillRect(position.x, position.y, size, size)
    })
}

// --- Movimentar cobra ---
const moveSnake = () => {
    if (!direction) return

    const head = snake[snake.length - 1]

    if (direction == "right") {
        snake.push({ x: head.x + size, y: head.y })
    }
    if (direction == "left") {
        snake.push({ x: head.x - size, y: head.y })
    }
    if (direction == "down") {
        snake.push({ x: head.x, y: head.y + size })
    }
    if (direction == "up") {
        snake.push({ x: head.x, y: head.y - size })
    }

    snake.shift()
}

// --- Desenhar grid ---
const drawGrid = () => {
    ctx.lineWidth = 1
    ctx.strokeStyle = "#191919"

    for (let i = 30; i < canvas.width; i += 30) {
        ctx.beginPath()
        ctx.lineTo(i, 0)
        ctx.lineTo(i, 600)
        ctx.stroke()

        ctx.beginPath()
        ctx.lineTo(0, i)
        ctx.lineTo(600, i)
        ctx.stroke()
    }
}

// --- Checar se comeu ---
const chackEat = () => {
    const head = snake[snake.length - 1]

    if (head.x == food.x && head.y == food.y) {
        incrementScore()
        snake.push(head)
        audio.play()

        let x = randomPosition()
        let y = randomPosition()

        while (snake.find((position) => position.x == x && position.y == y)) {
            x = randomPosition()
            y = randomPosition()
        }

        food.x = x
        food.y = y
        food.color = randomColor()
    }
}

// --- Checar colisão ---
const checkCollision = () => {
    const head = snake[snake.length - 1]
    const canvasLimit = canvas.width - size
    const neckIndex = snake.length - 2

    const wallCollision =
        head.x < 0 || head.x > canvasLimit || head.y < 0 || head.y > canvasLimit

    const selfCollision = snake.find((position, index) => {
        return index < neckIndex && position.x == head.x && position.y == head.y
    })

    if (wallCollision || selfCollision) {
        gameOver()
    }
}

// --- Game over ---
const gameOver = () => {
    direction = undefined;
    saveHighScore(); // salva o recorde

    menu.style.display = "flex";
    finalScore.innerHTML = `
        score <span>${score.innerText}</span><br>
        recorde <span>${highScore}</span>
    `;
    canvas.style.filter = "blur(2px)";
}

// --- Velocidade dinâmica ---
const getSpeed = () => {
    const baseSpeed = 300
    const speed = baseSpeed - (snake.length * 5)
    return Math.max(speed, 80)
}

// --- Loop principal ---
const gameLoop = () => {
    clearInterval(loopId)

    ctx.clearRect(0, 0, 600, 600)
    drawGrid()
    drawFood()
    moveSnake()
    drawSnake()
    chackEat()
    checkCollision()

    loopId = setTimeout(() => {
        gameLoop()
    }, getSpeed())
}

gameLoop()

// --- Controles por teclado ---
document.addEventListener("keydown", ({ key }) => {
    if (key == "ArrowRight" && direction != "left") {
        direction = "right"
    }
    if (key == "ArrowLeft" && direction != "right") {
        direction = "left"
    }
    if (key == "ArrowDown" && direction != "up") {
        direction = "down"
    }
    if (key == "ArrowUp" && direction != "down") {
        direction = "up"
    }
})

// --- Controles por toque (mobile swipe) ---
let startX, startY

canvas.addEventListener("touchstart", e => {
    e.preventDefault()
    const touch = e.touches[0]
    startX = touch.clientX
    startY = touch.clientY
}, { passive: false })

canvas.addEventListener("touchend", e => {
    e.preventDefault()
    const touch = e.changedTouches[0]
    const diffX = touch.clientX - startX
    const diffY = touch.clientY - startY

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && direction !== "left") {
            direction = "right"
        } else if (diffX < 0 && direction !== "right") {
            direction = "left"
        }
    } else {
        if (diffY > 0 && direction !== "up") {
            direction = "down"
        } else if (diffY < 0 && direction !== "down") {
            direction = "up"
        }
    }
}, { passive: false })

// --- Botão de jogar novamente ---
buttonPlay.addEventListener("click", () => {
    score.innerText = "00"
    menu.style.display = "none"
    canvas.style.filter = "none"

    snake = [initialPosition]
})
