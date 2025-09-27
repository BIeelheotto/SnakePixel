$(document).ready(function () {
    const canvas = $('#gameCanvas')[0];
    const ctx = canvas.getContext('2d');

    const tileSize = 20;
    const gridSize = canvas.width / tileSize;

    let snake = [];
    let direction = 'right';
    let food = {};
    let score = 0;
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    let gameOver = false;
    let gameStarted = false;

    let lastTime = 0;
    let accumulator = 0;
    let STEP = 250; // Velocidade lógica da cobra em ms (pode diminuir)

    $('#high-score').text(highScore);

    function drawStartScreen() {
        ctx.fillStyle = '#7ed957';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000';
        ctx.font = "28px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLASSIC SNAKE", canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = "12px 'Press Start 2P', monospace";
        ctx.fillText("Press SPACE or Tap", canvas.width / 2, canvas.height / 2 + 20);
    }

    function startGame() {
        gameStarted = true;
        snake = [{ x: 10, y: 10 }];
        direction = 'right';
        score = 0;
        $('#score').text(score);
        gameOver = false;
        STEP = 250;
        generateFood();

        lastTime = 0;
        accumulator = 0;
        requestAnimationFrame(gameLoop);
    }

    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        accumulator += deltaTime;

        while (accumulator >= STEP) {
            update();
            accumulator -= STEP;
        }

        const interpolation = accumulator / STEP;
        draw(interpolation);

        if (!gameOver) {
            requestAnimationFrame(gameLoop);
        }
    }

    function update() {
        const head = { x: snake[0].x, y: snake[0].y };

        switch (direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        snake.unshift(head);

        // Comer maçã
        if (head.x === food.x && head.y === food.y) {
            score += 5;
            $('#score').text(score);
            generateFood();

            // 🔥 Diminui o STEP (aumenta velocidade) a cada 3 maçãs
            if (score % 6 === 0) {
                STEP = Math.max(100, STEP - 12);
            }

        } else {
            snake.pop();
        }

        checkCollisions(head);
    }

    function checkCollisions(head) {
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            endGame();
        }

        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                endGame();
            }
        }
    }

    function draw(interpolation) {
        ctx.fillStyle = '#7ed957';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cobra com interpolação suave
        ctx.fillStyle = '#000';
        for (let i = 0; i < snake.length; i++) {
            const current = snake[i];
            const prev = snake[i + 1] || current;

            const x = prev.x + (current.x - prev.x) * interpolation;
            const y = prev.y + (current.y - prev.y) * interpolation;

            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }

        // Comida
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize, tileSize);
    }

    function generateFood() {
        let foodPosition;
        do {
            foodPosition = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
        } while (isFoodOnSnake(foodPosition));
        food = foodPosition;
    }

    function isFoodOnSnake(position) {
        return snake.some(segment => segment.x === position.x && segment.y === position.y);
    }

    function endGame() {
        gameOver = true;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            $('#high-score').text(highScore);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff";
        ctx.font = "20px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText("Restarting...", canvas.width / 2, canvas.height / 2 + 20);

        setTimeout(() => {
            if (!gameStarted || gameOver) {
                drawStartScreen();
                gameStarted = false;
            }
        }, 400);
    }

    // Teclado
    $(document).on('keydown', function (e) {
        if (!gameStarted && e.code === "Space") {
            startGame();
            return;
        }

        if (gameOver && e.code === "Space") {
            startGame();
            return;
        }

        const key = e.key;
        if ((key === 'ArrowUp' || key.toLowerCase() === 'w') && direction !== 'down') {
            direction = 'up';
        } else if ((key === 'ArrowDown' || key.toLowerCase() === 's') && direction !== 'up') {
            direction = 'down';
        } else if ((key === 'ArrowLeft' || key.toLowerCase() === 'a') && direction !== 'right') {
            direction = 'left';
        } else if ((key === 'ArrowRight' || key.toLowerCase() === 'd') && direction !== 'left') {
            direction = 'right';
        }
    });

    // Mobile → toque
    $(canvas).on('click touchstart', function () {
        if (!gameStarted || gameOver) {
            startGame();
        }
    });


    drawStartScreen();

  // === SWIPE DETECTION SEM LAG ===
    let touchStartX = 0;
    let touchStartY = 0;

    $(canvas).on('touchstart', function(e) {
        const touch = e.originalEvent.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    });

    $(canvas).on('touchend', function(e) {
        const touch = e.originalEvent.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        // Limite mínimo de movimento para ser considerado swipe
        const swipeThreshold = 20;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > swipeThreshold && direction !== 'left') {
                direction = 'right';
            } else if (deltaX < -swipeThreshold && direction !== 'right') {
                direction = 'left';
            }
        } else {
            if (deltaY > swipeThreshold && direction !== 'up') {
                direction = 'down';
            } else if (deltaY < -swipeThreshold && direction !== 'down') {
                direction = 'up';
            }
        }

        e.preventDefault(); // Impede o scroll da página
    });

});


   
