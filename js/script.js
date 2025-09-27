$(document).ready(function() {
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
    let gameInterval;
    let snakeSpeed = 250; // velocidade inicial lenta
    let gameStarted = false;

    $('#high-score').text(highScore);

    /** Desenha tela inicial */
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

    /** Inicia o jogo */
    function startGame() {
        gameStarted = true;
        snake = [{ x: 10, y: 10 }];
        direction = 'right';
        score = 0;
        $('#score').text(score);
        gameOver = false;
        snakeSpeed = 200;
        generateFood();

        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, snakeSpeed);
    }

    function gameLoop() {
        if (gameOver) return;
        update();
        draw();
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
            score += 2; // ✅ agora vale 2 pontos
            $('#score').text(score);
            generateFood();

            if (score % 6 === 0) { // aumenta dificuldade a cada 3 maçãs
                snakeSpeed = Math.max(60, snakeSpeed - 20);
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, snakeSpeed);
            }
        } else {
            snake.pop();
        }

        checkCollisions(head);
    }

    function checkCollisions(head) {
        // Colisão com parede
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            endGame();
        }
        // Colisão com corpo
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                endGame();
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#7ed957';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cobra
        ctx.fillStyle = '#000';
        snake.forEach(segment => {
            ctx.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
        });

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
        clearInterval(gameInterval);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            $('#high-score').text(highScore);
        }

        // Mensagem de Game Over
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff";
        ctx.font = "20px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText("Restarting...", canvas.width / 2, canvas.height / 2 + 20);

        // Reinício automático em 2s
        setTimeout(() => {
            if (!gameStarted || gameOver) {
                drawStartScreen();
                gameStarted = false;
            }
        }, 400);
    }

    // Controles teclado
    $(document).on('keydown', function(e) {
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

    // Mobile → toque para iniciar ou reiniciar
    $(canvas).on('click touchstart', function() {
        if (!gameStarted) {
            startGame();
        } else if (gameOver) {
            startGame();
        }
    });

        // Início
    drawStartScreen();

         // === SWIPE DETECTION COM requestAnimationFrame ===
    let isSwiping = false;
    let startX = 0, startY = 0;
    let rafId = null;

    function detectSwipe(touchX, touchY) {
        const dx = touchX - startX;
        const dy = touchY - startY;

        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && direction !== 'left') {
                    direction = 'right';
                } else if (dx < 0 && direction !== 'right') {
                    direction = 'left';
                }
            } else {
                if (dy > 0 && direction !== 'up') {
                    direction = 'down';
                } else if (dy < 0 && direction !== 'down') {
                    direction = 'up';
                }
            }

            // Após detectar uma direção, cancela o rastreio
            cancelAnimationFrame(rafId);
            isSwiping = false;
        } else {
            rafId = requestAnimationFrame(() => detectSwipe(touchX, touchY));
        }
    }

    $(canvas).on('touchstart', function(e) {
        const touch = e.originalEvent.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isSwiping = true;
    });

    $(canvas).on('touchmove', function(e) {
        if (!isSwiping) return;

        const touch = e.originalEvent.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;

        // Inicia o loop só na primeira vez
        if (!rafId) {
            rafId = requestAnimationFrame(() => detectSwipe(currentX, currentY));
        }

        e.preventDefault(); // Evita scroll da página
    });

    $(canvas).on('touchend touchcancel', function(e) {
        isSwiping = false;
        cancelAnimationFrame(rafId);
        rafId = null;
    });
});


   
