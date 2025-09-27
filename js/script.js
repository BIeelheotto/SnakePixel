$(document).ready(function () {
    const canvas = $('#gameCanvas')[0];
    const ctx = canvas.getContext('2d');

    const tileSize = 20;
    const gridSize = canvas.width / tileSize;
    const bgMusic = new Audio('/assets/music-for-gameSNAKE.mp3');
    bgMusic.loop = true;  // música em loop
    bgMusic.volume = 0.3; // volume mais baixo pra não incomodar

    const gameOverSound = new Audio('/assets/GAME-OVER.mp3');

    let currentLevel = 1;

    let snake = [];
    let npcSnake = [];
    let npcSnake2 = [];
    let npcSnake3 = [];
    let direction = 'right';
    let npcDirection = 'left';
    let npcDirection2 = 'right';
    let npcDirection3 = 'up';

    let foods = [];
    let score = 0;
    let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    let gameOver = false;
    let gameStarted = false;

    let lastTime = 0;
    let accumulator = 0;
    let STEP = 350;

    let showMessage = true;
    let obstacles = [];

    const eatSound = new Audio('/assets/assets_audio.mp3');
    const initialFoodCount = 4;

    $('#high-score').text(highScore);

    // --- HUD tamanho cobra ---
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

    let blinkTimer = 0;

    function drawStartScreen(deltaTime) {
        blinkTimer += deltaTime;
        ctx.fillStyle = '#19d108ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        ctx.fillStyle = '#020202ff';
        ctx.font = "28px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLASSIC SNAKE", canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillText("Nível Atual: " + currentLevel, canvas.width / 2, canvas.height / 2);

        if (Math.floor(blinkTimer / 500) % 2 === 0) {
            ctx.font = "12px 'Press Start 2P', monospace";
            ctx.fillText("Press SPACE or Tap to Start", canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillText("Use Arrow/WASD to Move", canvas.width / 2, canvas.height / 2 + 50);
        }
    }

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

        // 🔊 Música começa
        bgMusic.currentTime = 0;
        bgMusic.play();

        direction = 'right';
        npcDirection = 'left';
        npcDirection2 = 'right';
        npcDirection3 = 'up';

        snake = [{ x: 10, y: 10 }];
        npcSnake = [{ x: 20, y: 10 }];
        npcSnake2 = [{ x: 10, y: 20 }];
        npcSnake3 = [{ x: 15, y: 15 }];

        score = 0;
        STEP = 350;
        $('#score').text(score);
        updateSizeDisplay();

        obstacles = [];
        if (currentLevel === 2) {
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
        updateNPCDirection3();

        moveSnake(snake, direction, true);
        moveSnake(npcSnake, npcDirection, false, 'npc1');
        moveSnake(npcSnake2, npcDirection2, false, 'npc2');
        moveSnake(npcSnake3, npcDirection3, false, 'npc3');

        checkPlayerCollisions();

        updateSizeDisplay();
    }

    function updateNPCDirection() {
        npcDirection = getFoodChasingDirection(npcSnake, [snake, npcSnake2, npcSnake3])
            || getSafeRandomDirection(npcSnake, 'npc1')
            || npcDirection;
    }

    function updateNPCDirection2() {
        npcDirection2 = getFoodChasingDirection(npcSnake2, [snake, npcSnake, npcSnake3])
            || getSafeRandomDirection(npcSnake2, 'npc2')
            || npcDirection2;
    }

    function updateNPCDirection3() {
        npcDirection3 = getFoodChasingDirection(npcSnake3, [snake, npcSnake, npcSnake2])
            || getSafeRandomDirection(npcSnake3, 'npc3')
            || npcDirection3;
    }



    // Pathfinding simples para buscar comida
    function getFoodChasingDirection(npcSnakeRef, otherSnakes) {
        if (npcSnakeRef.length === 0 || foods.length === 0) return getSafeRandomDirection(npcSnakeRef);

        const head = npcSnakeRef[0];
        let closestFood = foods[0];
        let minDist = manhattanDistance(head, closestFood);

        for (let food of foods) {
            let dist = manhattanDistance(head, food);
            if (dist < minDist) {
                minDist = dist;
                closestFood = food;
            }
        }

        const possibleDirs = ['up', 'down', 'left', 'right'];
        let bestDir = null;
        let bestDist = Infinity;

        for (const dir of possibleDirs) {

            const nextPos = getNextPosition(head, dir);
            if (
                nextPos.x >= 0 && nextPos.x < gridSize &&
                nextPos.y >= 0 && nextPos.y < gridSize &&
                !isOnSnake(nextPos, npcSnakeRef) &&
                !isOnObstacles(nextPos) &&
                !otherSnakes.some(s => isOnSnake(nextPos, s))
            ) {
                const distToFood = manhattanDistance(nextPos, closestFood);
                if (distToFood < bestDist) {
                    bestDist = distToFood;
                    bestDir = dir;
                }
            }
        }

        return bestDir || getSafeRandomDirection(npcSnakeRef);
    }

    function manhattanDistance(p1, p2) { return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y); }
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

    function moveSnake(snakeRef, dir, isPlayer = false, npcId = null) {
        if (snakeRef.length === 0) return;

        const head = { x: snakeRef[0].x, y: snakeRef[0].y };
        switch (dir) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize || isOnObstacles(head)) {
            if (isPlayer) endGame(); else respawnNPC(npcId);
            return;
        }

        if (!isPlayer && isOnSnake(head, snake)) { respawnNPC(npcId); return; }
        if (!isPlayer && (isOnSnake(head, npcSnake) || isOnSnake(head, npcSnake2) || isOnSnake(head, npcSnake3))) {
            respawnNPC(npcId); return;
        }

        let ateFood = false;
        for (let i = 0; i < foods.length; i++) {
            if (foods[i].x === head.x && foods[i].y === head.y) {
                ateFood = true;
                foods.splice(i, 1);
                generateFood();
                if (isPlayer) {
                    score += 5 + Math.floor(snake.length / 5); // cresce com o tamanho da cobra
                    $('#score').text(score);
                    if (score % 6 === 0) STEP = Math.max(100, STEP - 12);
                    eatSound.play();
                }
                break;
            }
        }

        snakeRef.unshift(head);
        if (!ateFood) snakeRef.pop();
    }

    let npcRespawnCooldowns = {
        npc1: 0,
        npc2: 0,
        npc3: 0
    };

    function respawnNPC(npcId) {
        const now = Date.now();
        if (npcRespawnCooldowns[npcId] && now - npcRespawnCooldowns[npcId] < 500) return;
        npcRespawnCooldowns[npcId] = now;

        let newPos;
        do {
            newPos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        } while (
            isOnSnake(newPos, snake) || isOnSnake(newPos, npcSnake) ||
            isOnSnake(newPos, npcSnake2) || isOnSnake(newPos, npcSnake3) || isOnObstacles(newPos)
        );

        if (npcId === 'npc1') npcSnake = [newPos];
        if (npcId === 'npc2') npcSnake2 = [newPos];
        if (npcId === 'npc3') npcSnake3 = [newPos];
    }

    function getSafeRandomDirection(snakeRef, npcId = null) {
        const directions = ['up', 'down', 'left', 'right'];
        const currentHead = snakeRef[0];
        const validDirs = directions.filter(dir => {
            const nextPos = getNextPosition(currentHead, dir);
            const collisionWithWall =
                nextPos.x < 0 || nextPos.x >= gridSize ||
                nextPos.y < 0 || nextPos.y >= gridSize;
            const collisionWithSelf = isOnSnake(nextPos, snakeRef);
            const collisionWithObstacle = isOnObstacles(nextPos);
            const collisionWithOthers =
                isOnSnake(nextPos, snake) ||
                isOnSnake(nextPos, npcSnake) ||
                isOnSnake(nextPos, npcSnake2) ||
                isOnSnake(nextPos, npcSnake3);

            return !collisionWithWall &&
                !collisionWithSelf &&
                !collisionWithObstacle &&
                !collisionWithOthers;
        });

        // 🔴 Se não há movimento possível → NPC está travado
        if (validDirs.length === 0) {
            if (npcId) respawnNPC(npcId);
            return null;
        }

        return validDirs[Math.floor(Math.random() * validDirs.length)];
    }

    function isOnObstacles(pos) { return obstacles.some(ob => ob.x === pos.x && ob.y === pos.y); }

    function generateFood() {
        const playerHead = snake[0];
        const minDistanceFromPlayer = 3;
        const minDistanceFromOtherFoods = 5;

        // 🔹 Lista de posições livres
        const emptyTiles = [];
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                const pos = { x, y };
                if (
                    !isOnSnake(pos, snake) &&
                    !isOnSnake(pos, npcSnake) &&
                    !isOnSnake(pos, npcSnake2) &&
                    !isOnSnake(pos, npcSnake3) &&
                    !isOnObstacles(pos) &&
                    !isOnFood(pos)
                ) {
                    emptyTiles.push(pos);
                }
            }
        }

        // 🔹 Filtra respeitando as distâncias mínimas
        let validTiles = emptyTiles.filter(pos => {
            const distPlayer = manhattanDistance(pos, playerHead);
            const tooCloseToFood = foods.some(existing =>
                manhattanDistance(pos, existing) < minDistanceFromOtherFoods
            );
            return distPlayer >= minDistanceFromPlayer && !tooCloseToFood;
        });

        let foodPosition;

        if (validTiles.length > 0) {
            // pega posição aleatória das válidas
            foodPosition = validTiles[Math.floor(Math.random() * validTiles.length)];
        } else if (emptyTiles.length > 0) {
            // se não sobrou nenhuma válida → escolhe qualquer livre
            foodPosition = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        } else {
            // 🔴 Fallback extremo: tenta achar manualmente (quase nunca usado)
            do {
                foodPosition = {
                    x: Math.floor(Math.random() * gridSize),
                    y: Math.floor(Math.random() * gridSize)
                };
            } while (
                isOnSnake(foodPosition, snake) ||
                isOnSnake(foodPosition, npcSnake) ||
                isOnSnake(foodPosition, npcSnake2) ||
                isOnSnake(foodPosition, npcSnake3) ||
                isOnFood(foodPosition) ||
                isOnObstacles(foodPosition)
            );
        }

        foods.push(foodPosition);
    }



    function isOnSnake(pos, snakeRef) { return snakeRef.some(segment => segment.x === pos.x && segment.y === pos.y); }
    function isOnFood(pos) { return foods.some(food => food.x === pos.x && food.y === pos.y); }

    function checkPlayerCollisions() {
        const head = snake[0];
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) return endGame();
        if (isOnObstacles(head)) return endGame();
        for (let i = 1; i < snake.length; i++) if (head.x === snake[i].x && head.y === snake[i].y) return endGame();
        for (const segment of npcSnake) if (head.x === segment.x && head.y === segment.y) return endGame();
        for (const segment of npcSnake2) if (head.x === segment.x && head.y === segment.y) return endGame();
        for (const segment of npcSnake3) if (head.x === segment.x && head.y === segment.y) return endGame();
    }

    function draw() {
        ctx.fillStyle = '#89fa66ff';



        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();


        ctx.fillStyle = '#ff830fff';
        for (const ob of obstacles) ctx.fillRect(ob.x * tileSize, ob.y * tileSize, tileSize, tileSize);



        ctx.fillStyle = '#000000';

        for (const s of snake) ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);


        ctx.fillStyle = '#0000cc';
        for (const s of npcSnake) ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);


        ctx.fillStyle = '#006400';
        for (const s of npcSnake2) ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);

        ctx.fillStyle = '#800080';
        for (const s of npcSnake3) ctx.fillRect(s.x * tileSize, s.y * tileSize, tileSize, tileSize);

        ctx.fillStyle = '#ff3333';
        for (const food of foods) ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize, tileSize);
    }

    function endGame() {
        gameOver = true;

        // 🔇 Pausa música
        bgMusic.pause();

        // 🔊 Toca som de derrota
        gameOverSound.currentTime = 0;
        gameOverSound.play();

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
        setTimeout(() => { drawStartScreen(); gameStarted = false; }, 1500);
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

        if (key === 'n') currentLevel = 1;
        if (key === 'm') currentLevel = 2;

    });

    // CONTROLES MOBILE
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


        const swipeThreshold = 15; // melhor responsividade

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

