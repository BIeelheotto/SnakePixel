$(document).ready(function() {
    // --- CONFIGURAÇÕES E VARIÁVEIS GLOBAIS ---

    // Obtém o elemento canvas e seu contexto 2D para desenhar
    const canvas = $('#gameCanvas')[0];
    const ctx = canvas.getContext('2d');

    // Define o tamanho de cada "quadrado" no grid do jogo
    const tileSize = 20;
    // Calcula quantos quadrados cabem na largura/altura do canvas
    const gridSize = canvas.width / tileSize;

    let snake = []; // Array que armazena as partes do corpo da cobra
    let direction = 'right'; // Direção inicial da cobra
    let food = {}; // Objeto para a comida
    let score = 0; // Pontuação inicial
    let highScore = localStorage.getItem('snakeHighScore') || 0; // Pega o recorde do navegador
    let gameOver = false;
    let gameInterval; // Variável para controlar o loop do jogo

    // Atualiza o placar de recorde na tela
    $('#high-score').text(highScore);

    // --- FUNÇÕES PRINCIPAIS DO JOGO ---

    /**
     * Inicia ou reinicia o jogo, resetando todas as variáveis.
     */
    function startGame() {
        snake = [{ x: 10, y: 10 }]; // Posição inicial da cobra no centro do grid
        direction = 'right';
        score = 0;
        $('#score').text(score);
        gameOver = false;
        generateFood(); // Gera a primeira comida

        // Limpa o loop anterior (se houver) e inicia um novo
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, 100); // A velocidade do jogo (100ms)
    }

    /**
     * O loop principal do jogo, que roda a cada intervalo de tempo.
     */
    function gameLoop() {
        if (gameOver) return;

        update(); // Atualiza a posição da cobra e verifica colisões
        draw(); // Desenha tudo na tela
    }

    /**
     * Atualiza o estado do jogo (movimento e colisões).
     */
    function update() {
        // Cria a nova cabeça da cobra com base na direção atual
        const head = { x: snake[0].x, y: snake[0].y };
        switch (direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Adiciona a nova cabeça ao início do array da cobra
        snake.unshift(head);

        // Verifica colisão com a comida
        if (head.x === food.x && head.y === food.y) {
            score++; // Aumenta a pontuação
            $('#score').text(score); // Atualiza o placar
            generateFood(); // Gera nova comida
        } else {
            // Se não comeu, remove o último segmento da cauda para dar a ilusão de movimento
            snake.pop();
        }
        
        checkCollisions(head);
    }
    
    /**
    * Verifica todas as possíveis colisões
    */
    function checkCollisions(head) {
        // Colisão com as paredes
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
            endGame();
        }

        // Colisão com o próprio corpo
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                endGame();
            }
        }
    }

    /**
     * Desenha todos os elementos do jogo no canvas.
     */
    function draw() {
        // Limpa o canvas (fundo preto)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenha a cobra
        ctx.fillStyle = '#00ff00'; // Cor da cobra
        snake.forEach(segment => {
            ctx.fillRect(segment.x * tileSize, segment.y * tileSize, tileSize, tileSize);
        });

        // Desenha a comida
        ctx.fillStyle = '#ff0000'; // Cor da comida
        ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize, tileSize);
    }

    /**
     * Gera uma nova comida em uma posição aleatória que não esteja sobre a cobra.
     */
    function generateFood() {
        let foodPosition;
        do {
            foodPosition = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
        } while (isFoodOnSnake(foodPosition)); // Repete se a comida aparecer na cobra
        
        food = foodPosition;
    }
    
    /**
    * Função auxiliar para verificar se a posição gerada para a comida está no corpo da cobra.
    */
    function isFoodOnSnake(position) {
        for (let segment of snake) {
            if (segment.x === position.x && segment.y === position.y) {
                return true;
            }
        }
        return false;
    }


    /**
     * Finaliza o jogo.
     */
    function endGame() {
        gameOver = true;
        clearInterval(gameInterval); // Para o loop do jogo

        // Atualiza o recorde se a pontuação atual for maior
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            $('#high-score').text(highScore);
        }

        // Mostra a tela de Game Over
        $('#final-score').text(score);
        $('#gameOverModal').modal('show');
    }

    // --- CONTROLES (TECLADO E BOTÕES) ---

    /**
     * Ouve os eventos de teclado para mudar a direção.
     */
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

    /**
     * Adiciona funcionalidade aos botões de controle móvel.
     */
    $('#upBtn').on('click', () => { if (direction !== 'down') direction = 'up'; });
    $('#downBtn').on('click', () => { if (direction !== 'up') direction = 'down'; });
    $('#leftBtn').on('click', () => { if (direction !== 'right') direction = 'left'; });
    $('#rightBtn').on('click', () => { if (direction !== 'left') direction = 'right'; });

    /**
     * Reinicia o jogo quando o botão "Jogar Novamente" é clicado.
     */
    $('#restart-button').on('click', function() {
        $('#gameOverModal').modal('hide');
        startGame();
    });

    // --- INÍCIO DO JOGO ---
    startGame();
});