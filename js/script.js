const Game = {
    CONFIG: {
        size: 30,
        baseSpeed: 200,
        minSpeed: 60,
        npcSpawnPoints: [20, 50, 80, 120]
    },

    state: {
        snake: [],
        direction: undefined,
        food: null,
        score: 0,
        highScore: 0,
        npcs: [],
        ranking: [],
        ate: false,
        lastTime: 0,
        running: true // 🚀 agora começa rodando automaticamente
    },

    canvas: null,
    ctx: null,
    touchStartX: 0,
    touchStartY: 0,

    init() {
        this.canvas = $("#gameCanvas")[0];
        this.ctx = this.canvas.getContext("2d");
        this.loadRanking();
        this.reset();
        this.bindEvents();
        requestAnimationFrame(this.gameLoop.bind(this));
    },

    reset() {
        this.state.snake = [{ x: 270, y: 240 }];
        this.state.direction = "right"; // começa andando
        this.state.food = this.randomFood();
        this.state.score = 0;
        this.state.npcs = [];
        this.state.ate = false;
        this.state.lastTime = 0;
        this.state.running = true;
        this.updateUI();
        this.draw();
    },

    gameLoop(currentTime = 0) {
        requestAnimationFrame(this.gameLoop.bind(this));
        if (!this.state.running) return;

        const delta = currentTime - this.state.lastTime;
        const speed = this.getSpeed();

        if (delta > speed) {
            this.moveSnake();
            this.moveNPCs();
            this.checkEat();
            this.checkCollision();
            this.draw();
            this.state.lastTime = currentTime;
        }
    },

    updateUI() {
        $(".score--value").text(this.state.score.toString().padStart(2, "0"));
        $(".high-score span").text(localStorage.getItem("snakeHighScore") || 0);
        this.renderRanking();
    },

    showGameOver() {
        this.saveHighScore();
        this.saveRanking();
        $(".menu-screen").fadeIn();
        $(".final-score").html(
            `Score: <span>${this.state.score}</span><br>
             Recorde: <span>${localStorage.getItem("snakeHighScore")}</span>`
        );
        $(this.canvas).css("filter", "blur(2px)");
    },

    hideGameOver() {
        $(".menu-screen").fadeOut();
        $(this.canvas).css("filter", "none");
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        this.ctx.strokeStyle = "#191919";
        for (let i = this.CONFIG.size; i < this.canvas.width; i += this.CONFIG.size) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke();
        }

        // Food
        this.ctx.fillStyle = this.state.food.color;
        this.ctx.fillRect(this.state.food.x, this.state.food.y, this.CONFIG.size, this.CONFIG.size);

        // Snake
        this.state.snake.forEach((seg, i) => {
            this.ctx.fillStyle = i === this.state.snake.length - 1 ? "white" : "#ddd";
            this.ctx.fillRect(seg.x, seg.y, this.CONFIG.size, this.CONFIG.size);
        });

        // NPCs
        this.state.npcs.forEach(npc => {
            this.ctx.fillStyle = npc.color;
            npc.body.forEach(p => this.ctx.fillRect(p.x, p.y, this.CONFIG.size, this.CONFIG.size));
        });
    },

    moveSnake() {
        if (!this.state.direction) return;
        const head = this.state.snake[this.state.snake.length - 1];
        let newHead;

        if (this.state.direction === "right") newHead = { x: head.x + this.CONFIG.size, y: head.y };
        if (this.state.direction === "left") newHead = { x: head.x - this.CONFIG.size, y: head.y };
        if (this.state.direction === "down") newHead = { x: head.x, y: head.y + this.CONFIG.size };
        if (this.state.direction === "up") newHead = { x: head.x, y: head.y - this.CONFIG.size };

        this.state.snake.push(newHead);
        if (!this.state.ate) {
            this.state.snake.shift();
        } else {
            this.state.ate = false;
        }
    },

    moveNPCs() {
        this.state.npcs.forEach(npc => {
            let head = { ...npc.body[npc.body.length - 1] };
            let newHead;
            const move = (dir) => {
                if (dir === "right") return { x: head.x + this.CONFIG.size, y: head.y };
                if (dir === "left") return { x: head.x - this.CONFIG.size, y: head.y };
                if (dir === "down") return { x: head.x, y: head.y + this.CONFIG.size };
                if (dir === "up") return { x: head.x, y: head.y - this.CONFIG.size };
            };
            newHead = move(npc.dir);
            if (!newHead || newHead.x < 0 || newHead.y < 0 || newHead.x >= this.canvas.width || newHead.y >= this.canvas.height) {
                const opposites = { right: "left", left: "right", up: "down", down: "up" };
                npc.dir = opposites[npc.dir];
                newHead = move(npc.dir);
            }
            npc.body.push(newHead);
            if (npc.body.length > 5) npc.body.shift();
        });
    },

    checkEat() {
        const head = this.state.snake[this.state.snake.length - 1];
        if (head.x === this.state.food.x && head.y === this.state.food.y) {
            this.state.score += 10;
            this.state.food = this.randomFood();
            this.state.ate = true;
            if (this.CONFIG.npcSpawnPoints.includes(this.state.score)) this.spawnNPC();
            this.updateUI();
        }
    },

    checkCollision() {
        const head = this.state.snake[this.state.snake.length - 1];
        const limit = this.canvas.width;
        const wall = head.x < 0 || head.y < 0 || head.x >= limit || head.y >= limit;
        const self = this.state.snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y);
        const npc = this.state.npcs.some(npc => npc.body.some(p => p.x === head.x && p.y === head.y));
        if (wall || self || npc) {
            this.state.running = false;
            this.showGameOver();
        }
    },

    isPositionOccupied(pos) {
        const onSnake = this.state.snake.some(seg => seg.x === pos.x && seg.y === pos.y);
        const onNpcs = this.state.npcs.some(npc => npc.body.some(p => p.x === pos.x && p.y === pos.y));
        return onSnake || onNpcs;
    },

    saveRanking() {
        this.state.ranking.push(this.state.score);
        this.state.ranking.sort((a, b) => b - a);
        this.state.ranking = this.state.ranking.slice(0, 5);
        localStorage.setItem("snakeRanking", JSON.stringify(this.state.ranking));
    },

    loadRanking() {
        this.state.ranking = JSON.parse(localStorage.getItem("snakeRanking")) || [];
    },

    renderRanking() {
        if (this.state.ranking.length === 0) {
            $(".ranking").html("<h4>Ranking</h4><p>Nenhuma partida registrada.</p>");
            return;
        }
        let list = this.state.ranking.map((s, i) => `<li>#${i + 1}: ${s} pontos</li>`).join("");
        $(".ranking").html(`<h4>Ranking</h4><ul>${list}</ul>`);
    },

    saveHighScore() {
        this.state.highScore = localStorage.getItem("snakeHighScore") || 0;
        if (this.state.score > this.state.highScore) {
            localStorage.setItem("snakeHighScore", this.state.score);
        }
    },

    randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomPosition() {
        const maxCells = this.canvas.width / this.CONFIG.size;
        const n = this.randomNumber(0, maxCells - 1);
        return n * this.CONFIG.size;
    },

    randomColor() {
        return `rgb(${this.randomNumber(50,200)},${this.randomNumber(50,200)},${this.randomNumber(50,200)})`;
    },

    randomFood() {
        let newFood;
        do {
            newFood = { x: this.randomPosition(), y: this.randomPosition(), color: this.randomColor() };
        } while (this.isPositionOccupied(newFood));
        return newFood;
    },

    spawnNPC() {
        let initialPos;
        do {
            initialPos = { x: this.randomPosition(), y: this.randomPosition() };
        } while (this.isPositionOccupied(initialPos));
        this.state.npcs.push({
            body: [initialPos],
            dir: ["up", "down", "left", "right"][this.randomNumber(0, 3)],
            color: "orange"
        });
    },

    getSpeed() {
        return Math.max(this.CONFIG.baseSpeed - this.state.snake.length * 3, this.CONFIG.minSpeed);
    },

    bindEvents() {
        $(document).on("keydown", (e) => {
            if (e.key === "ArrowRight" && this.state.direction !== "left") this.state.direction = "right";
            if (e.key === "ArrowLeft" && this.state.direction !== "right") this.state.direction = "left";
            if (e.key === "ArrowUp" && this.state.direction !== "down") this.state.direction = "up";
            if (e.key === "ArrowDown" && this.state.direction !== "up") this.state.direction = "down";
        });

        $(this.canvas).on("touchstart", (e) => {
            const t = e.originalEvent.touches[0];
            this.touchStartX = t.clientX;
            this.touchStartY = t.clientY;
        });

        $(this.canvas).on("touchend", (e) => {
            const t = e.originalEvent.changedTouches[0];
            const dx = t.clientX - this.touchStartX;
            const dy = t.clientY - this.touchStartY;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && this.state.direction !== "left") this.state.direction = "right";
                else if (dx < 0 && this.state.direction !== "right") this.state.direction = "left";
            } else {
                if (dy > 0 && this.state.direction !== "up") this.state.direction = "down";
                else if (dy < 0 && this.state.direction !== "down") this.state.direction = "up";
            }
        });

        $(".btn-play").on("click", () => {
            this.hideGameOver();
            this.reset();
        });

        this.resizeCanvas();
        $(window).on("resize", () => this.resizeCanvas());
    },

    resizeCanvas() {
        const container = $(".game-container")[0];
        const size = Math.floor(Math.min(container.clientWidth, 600) / this.CONFIG.size) * this.CONFIG.size;
        this.canvas.width = size;
        this.canvas.height = size;
        this.draw();
    }
};

$(document).ready(() => {
    Game.init();
});
