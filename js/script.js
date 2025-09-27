$(document).ready(function() {
    // --- CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ---

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
    let snakeSpeed = 220; // velocidade inicial em ms

    $('#high-score').text(highScore);

    // --- FUNÇÕES PRINCIPAIS DO JOGO ---

    function startGame() {
        snake = [{ x: 10, y: 10 }];
        direction = 'right';
        score = 0;
        $('#score').text(score);
        gameOver = false;
        snakeSpeed = 220; // reseta a velocidade inicial
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

        // --- colisão com comida ---
        if (head.x === food.x && head.y === food.y) {
            score++;
            $('#score').text(score);
            generateFood();

            // aumenta a velocidade a cada 5 pontos
            if (score % 5 === 0) {
                snakeSpeed = Math.max(30, snakeSpeed - 10); // limite mínimo de 30ms
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, snakeSpeed);
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

    function draw() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00ff00';
        snake.forEach(segment => {
            ctx.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
        });

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
        for (let segment of snake) {
            if (segment.x === position.x && segment.y === position.y) {
                return true;
            }
        }
        return false;
    }

    function endGame() {
        gameOver = true;
        clearInterval(gameInterval);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            $('#high-score').text(highScore);
        }

        $('#final-score').text(score);
        $('#gameOverModal').modal('show');
    }

    // --- CONTROLES ---
    $(document).on('keydown', function(e) {
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

    $('#upBtn').on('click', () => { if (direction !== 'down') direction = 'up'; });
    $('#downBtn').on('click', () => { if (direction !== 'up') direction = 'down'; });
    $('#leftBtn').on('click', () => { if (direction !== 'right') direction = 'left'; });
    $('#rightBtn').on('click', () => { if (direction !== 'left') direction = 'right'; });

    $('#restart-button').on('click', function() {
        $('#gameOverModal').modal('hide');
        startGame();
    });

    // --- INÍCIO DO JOGO ---
    startGame();
});
