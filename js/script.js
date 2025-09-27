$(document).ready(function () {
    const canvas = $('#gameCanvas')[0];
    const ctx = canvas.getContext('2d');

    const tileSize = 20;
    const gridSize = canvas.width / tileSize;

    // Níveis: 1 (sem obstáculos), 2 (com obstáculos)
    let currentLevel = 1;

    let snake = [];
    let npcSnake = [];
    let direction = 'right';
    let npcDirection = 'left';

    let npcSnake2 = [];
    let npcDirection2 = 'right';

    let foods = [];
    let score = 0;
    let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    let gameOver = false;
    let gameStarted = false;

    let lastTime = 0;
    let accumulator = 0;
    let STEP = 250;

    let showMessage = true;

    // Obstáculos (array de posições bloqueadas)
    let obstacles = [];

    const eatSound = new Audio('/assets/assets_audio.mp3');

    // Configurável: quantidade inicial de comida
    const initialFoodCount = 3;

    $('#high-score').text(highScore);

    // --- Atualizar tamanho da cobra ---
    function updateSizeDisplay() {
        if ($('#snake-size').length === 0) {
            $('#scoreboard').append('<span id="snake-size" style="margin-left:20px">Tamanho: 1</span>');
        } else {
            $('#snake-size').text('Tamanho: ' + snake.length);
        }
    }

    // --- Tela inicial piscante ---
    setInterval(() => {
        if (!gameStarted && !gameOver) {
            showMessage = !showMessage;
            drawStartScreen();
        }
    }, 500);

    function drawStartScreen() {
        ctx.fillStyle = '#19d108ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenha grade no fundo (malha quadriculada)
        drawGrid();

        ctx.fillStyle = '#020202ff';
        ctx.font = "28px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLASSIC SNAKE", canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillText("Nível Atual: " + currentLevel, canvas.width / 2, canvas.height / 2);

        if (showMessage) {
            ctx.font = "12px 'Press Start 2P', monospace";
            ctx.fillText("Press SPACE or Tap to Start", canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillText("Use Arrow/WASD to Move", canvas.width / 2, canvas.height / 2 + 50);
        }
    }

    // --- Desenhar grade ---
    function drawGrid() {
        ctx.strokeStyle = '#615f5fff';
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvas.width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    function startGame() {
        gameStarted = true;
        gameOver = false;
        direction = 'right';
        npcDirection = 'left';
        npcDirection2 = 'right';

        snake = [{ x: 10, y: 10 }];
        npcSnake = [{ x: 20, y: 10 }];
        npcSnake2 = [{ x: 10, y: 20 }];  // posição inicial da nova NPC2

        score = 0;
        STEP = 250;
        $('#score').text(score);
        updateSizeDisplay();

        // Define obstáculos conforme o nível
        obstacles = [];
        if (currentLevel === 2) {
            // Exemplo obstáculos formando um "muro" no meio
            for (let i = 5; i < 15; i++) {
                obstacles.push({ x: i, y: 10 });
            }
        }

        foods = [];
        for (let i = 0; i < initialFoodCount; i++) {
            generateFood();
        }

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

        draw();

        if (!gameOver) requestAnimationFrame(gameLoop);
    }

    function update() {
        updateNPCDirection();
        updateNPCDirection2();

        moveSnake(snake, direction, true);
        moveSnake(npcSnake, npcDirection, false);
        moveSnake(npcSnake2, npcDirection2, false);

        checkPlayerCollisions();

        updateSizeDisplay();
    }

    // --- Atualiza direção NPC1 com pathfinding simples evitando obstáculos e outras cobras ---
    function updateNPCDirection() {
        const head = npcSnake[0];
        if (foods.length === 0) {
            npcDirection = getSafeRandomDirection(npcSnake);
            return;
        }

        // Encontra comida mais próxima
        let closestFood = foods[0];
        let minDist = manhattanDistance(head, closestFood);
        for (let food of foods) {
            let dist = manhattanDistance(head, food);
            if (dist < minDist) {
                minDist = dist;
                closestFood = food;
            }
        }

        // Avalia próximas posições para melhor direção
        const possibleDirs = ['up', 'down', 'left', 'right'];
        let bestDir = null;
        let bestDist = Infinity;

        for (const dir of possibleDirs) {
            const nextPos = getNextPosition(head, dir);

            if (
                nextPos.x >= 0 && nextPos.x < gridSize &&
                nextPos.y >= 0 && nextPos.y < gridSize &&
                !isOnSnake(nextPos, npcSnake) &&
                !isOnSnake(nextPos, snake) &&
                !isOnSnake(nextPos, npcSnake2) &&
                !isOnObstacles(nextPos)
            ) {
                const distToFood = manhattanDistance(nextPos, closestFood);
                if (distToFood < bestDist) {
                    bestDist = distToFood;
                    bestDir = dir;
                }
            }
        }

        if (bestDir) {
            npcDirection = bestDir;
        } else {
            npcDirection = getSafeRandomDirection(npcSnake);
        }
    }

    // --- Atualiza direção NPC2 com pathfinding simples evitando obstáculos e outras cobras ---
    function updateNPCDirection2() {
        const head = npcSnake2[0];
        if (foods.length === 0) {
            npcDirection2 = getSafeRandomDirection(npcSnake2);
            return;
        }

        // Encontra comida mais próxima
        let closestFood = foods[0];
        let minDist = manhattanDistance(head, closestFood);
        for (let food of foods) {
            let dist = manhattanDistance(head, food);
            if (dist < minDist) {
                minDist = dist;
                closestFood = food;
            }
        }

        // Avalia próximas posições para melhor direção
        const possibleDirs = ['up', 'down', 'left', 'right'];
        let bestDir = null;
        let bestDist = Infinity;

        for (const dir of possibleDirs) {
            const nextPos = getNextPosition(head, dir);

            if (
                nextPos.x >= 0 && nextPos.x < gridSize &&
                nextPos.y >= 0 && nextPos.y < gridSize &&
                !isOnSnake(nextPos, npcSnake2) &&
                !isOnSnake(nextPos, snake) &&
                !isOnSnake(nextPos, npcSnake) &&
                !isOnObstacles(nextPos)
            ) {
                const distToFood = manhattanDistance(nextPos, closestFood);
                if (distToFood < bestDist) {
                    bestDist = distToFood;
                    bestDir = dir;
                }
            }
        }

        if (bestDir) {
            npcDirection2 = bestDir;
        } else {
            npcDirection2 = getSafeRandomDirection(npcSnake2);
        }
    }

    // Distância Manhattan
    function manhattanDistance(p1, p2) {
        return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
    }

    // Próxima posição dado direção
    function getNextPosition(pos, dir) {
        const newPos = { x: pos.x, y: pos.y };
        switch (dir) {
            case 'up': newPos.y--; break;
            case 'down': newPos.y++; break;
            case 'left': newPos.x--; break;
            case 'right': newPos.x++; break;
        }
        return newPos;
    }

    // Move cobra considerando obstáculos e colisões
    function moveSnake(snakeRef, dir, isPlayer = false) {
        const head = { x: snakeRef[0].x, y: snakeRef[0].y };
        switch (dir) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Verifica colisão com paredes
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            if (isPlayer) endGame();
            else return; // NPC para se colidir com parede
            return;
        }

        // Verifica colisão com obstáculos
        if (isOnObstacles(head)) {
            if (isPlayer) endGame();
            else return; // NPC para se colidir com obstáculo
            return;
        }

        // Verifica colisão com as cobras (exceto na cabeça do jogador que pode se mover)
        if (!isPlayer) {
            if (isOnSnake(head, snake) || isOnSnake(head, npcSnake) || isOnSnake(head, npcSnake2)) {
                // NPC tenta mudar direção na próxima atualização (não move)
                return;
            }
        }

        // Checa comida
        let ateFood = false;
        for (let i = 0; i < foods.length; i++) {
            if (foods[i].x === head.x && foods[i].y === head.y) {
                ateFood = true;
                foods.splice(i, 1);
                generateFood();
                if (isPlayer) {
                    score += 5;
                    $('#score').text(score);
                    if (score % 6 === 0) STEP = Math.max(100, STEP - 12);
                   eatSound.play();  // <-- TOCA O SOM AQUI
                }
                break;
            }
        }

        // Insere nova cabeça
        snakeRef.unshift(head);

        if (!ateFood) {
            snakeRef.pop();
        }
    }

    // Direção aleatória segura considerando obstáculos e outras cobras
    function getSafeRandomDirection(snakeRef) {
        const directions = ['up', 'down', 'left', 'right'];
        const currentHead = snakeRef[0];
        const validDirs = directions.filter(dir => {
            let newX = currentHead.x;
            let newY = currentHead.y;

            switch (dir) {
                case 'up': newY--; break;
                case 'down': newY++; break;
                case 'left': newX--; break;
                case 'right': newX++; break;
            }

            const collisionWithWall = newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize;
            const collisionWithSelf = snakeRef.some(s => s.x === newX && s.y === newY);
            const collisionWithObstacle = isOnObstacles({ x: newX, y: newY });
            // Para NPCs, evita colidir com outras cobras também
            const collisionWithOtherSnakes = isOnSnake({ x: newX, y: newY }, snake) || isOnSnake({ x: newX, y: newY }, npcSnake) || isOnSnake({ x: newX, y: newY }, npcSnake2);

            return !collisionWithWall && !collisionWithSelf && !collisionWithObstacle && !collisionWithOtherSnakes;
        });

        return validDirs.length ? validDirs[Math.floor(Math.random() * validDirs.length)] : null;
    }

    // Verifica se está em obstáculos
    function isOnObstacles(pos) {
        return obstacles.some(ob => ob.x === pos.x && ob.y === pos.y);
    }

    function generateFood() {
        let foodPosition;
        do {
            foodPosition = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
        } while (
            isOnSnake(foodPosition, snake) ||
            isOnSnake(foodPosition, npcSnake) ||
            isOnSnake(foodPosition, npcSnake2) ||
            isOnFood(foodPosition) ||
            isOnObstacles(foodPosition)
        );

        foods.push(foodPosition);
    }

    function isOnSnake(pos, snakeRef) {
        return snakeRef.some(segment => segment.x === pos.x && segment.y === pos.y);
    }

    function isOnFood(pos) {
        return foods.some(food => food.x === pos.x && food.y === pos.y);
    }

    function checkPlayerCollisions() {
        const head = snake[0];

        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            endGame();
            return;
        }

        if (isOnObstacles(head)) {
            endGame();
            return;
        }

        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                endGame();
                return;
            }
        }

        for (const segment of npcSnake) {
            if (head.x === segment.x && head.y === segment.y) {
                endGame();
                return;
            }
        }

        for (const segment of npcSnake2) {
            if (head.x === segment.x && head.y === segment.y) {
                endGame();
                return;
            }
        }
    }

    function draw() {
        ctx.fillStyle = '#89fa66ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawGrid();

        // Obstáculos - laranja
        ctx.fillStyle = '#ff830fff';
        for (const ob of obstacles) {
            ctx.fillRect(ob.x * tileSize, ob.y * tileSize, tileSize, tileSize);
        }

        // jogador - preto
        ctx.fillStyle = '#000000';
        for (const s of snake) {
            ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);
        }

        // NPC1 - azul escuro
        ctx.fillStyle = '#0000cc';
        for (const s of npcSnake) {
            ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);
        }

        // NPC2 - verde escuro (diferente das outras)
        ctx.fillStyle = '#006400';
        for (const s of npcSnake2) {
            ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);
        }

        // comidas - vermelho vivo
        ctx.fillStyle = '#ff3333';
        for (const food of foods) {
            ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize, tileSize);
        }
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
            drawStartScreen();
            gameStarted = false;
        }, 1500);
    }

    // CONTROLES DE TECLADO
    $(document).on('keydown', function (e) {
        if (!gameStarted && e.code === "Space") return startGame();
        if (gameOver && e.code === "Space") return startGame();

        const key = e.key;
        if ((key === 'ArrowUp' || key === 'w') && direction !== 'down') direction = 'up';
        if ((key === 'ArrowDown' || key === 's') && direction !== 'up') direction = 'down';
        if ((key === 'ArrowLeft' || key === 'a') && direction !== 'right') direction = 'left';
        if ((key === 'ArrowRight' || key === 'd') && direction !== 'left') direction = 'right';

        // Trocar nível (1 e 2) via teclas N e M para teste (opcional)
        if (key === 'n') currentLevel = 1;
        if (key === 'm') currentLevel = 2;
    });

    // CONTROLES MOBILE - TOQUE E BOTÕES
    $(canvas).on('click touchstart', function () {
        if (!gameStarted || gameOver) startGame();
    });


    // SWIPE MOBILE
    let touchStartX = 0, touchStartY = 0;
    $(canvas).on('touchstart', function (e) {
        const touch = e.originalEvent.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    });

    $(canvas).on('touchend', function (e) {
        const touch = e.originalEvent.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;


        const swipeThreshold = 20;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > swipeThreshold && direction !== 'left') direction = 'right';
            else if (deltaX < -swipeThreshold && direction !== 'right') direction = 'left';
        } else {
            if (deltaY > swipeThreshold && direction !== 'up') direction = 'down';
            else if (deltaY < -swipeThreshold && direction !== 'down') direction = 'up';
        }
        e.preventDefault();
    });

    // BOTÕES CONTROLE MOBILE
    $('#mobile-controls button').on('click', function () {
        const dir = $(this).data('dir');
        if (dir === 'up' && direction !== 'down') direction = 'up';
        if (dir === 'down' && direction !== 'up') direction = 'down';
        if (dir === 'left' && direction !== 'right') direction = 'left';
        if (dir === 'right' && direction !== 'left') direction = 'right';
    });

    drawStartScreen();
});

// --- FIM DO CÓDIGO ---

