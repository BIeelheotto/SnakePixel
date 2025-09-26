const Game = {
  config: {
    cell: 30,
    baseSpeed: 200,
    minSpeed: 60,
    npcSpawn: [20, 50, 80, 120]
  },

  state: {
    snake: [],
    dir: "right",
    food: null,
    npcs: [],
    score: 0,
    ranking: [],
    running: true,
    ate: false,
    lastTime: 0
  },

  canvas: null,
  ctx: null,
  touch: { x: 0, y: 0 },

  init() {
    this.canvas = $("#gameCanvas")[0];
    this.ctx = this.canvas.getContext("2d");
    this.loadRanking();
    this.reset();
    this.bindEvents();
    requestAnimationFrame(this.loop.bind(this));
  },

  reset() {
    this.state.snake = [{x: 150, y: 150}];
    this.state.dir = "right";
    this.state.food = this.randomFood();
    this.state.npcs = [];
    this.state.score = 0;
    this.state.running = true;
    this.updateUI();
  },

  loop(time=0) {
    requestAnimationFrame(this.loop.bind(this));
    if (!this.state.running) return;

    const delta = time - this.state.lastTime;
    if (delta > this.speed()) {
      this.moveSnake();
      this.moveNPCs();
      this.checkEat();
      this.checkCollision();
      this.draw();
      this.state.lastTime = time;
    }
  },

  speed() {
    return Math.max(this.config.baseSpeed - this.state.snake.length*3, this.config.minSpeed);
  },

  draw() {
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    // food
    this.ctx.fillStyle = this.state.food.color;
    this.ctx.fillRect(this.state.food.x,this.state.food.y,this.config.cell,this.config.cell);

    // snake
    this.state.snake.forEach((s,i)=>{
      this.ctx.fillStyle = i === this.state.snake.length-1 ? "white":"#aaa";
      this.ctx.fillRect(s.x,s.y,this.config.cell,this.config.cell);
    });

    // NPCs
    this.state.npcs.forEach(n=>{
      this.ctx.fillStyle = n.color;
      n.body.forEach(p=>this.ctx.fillRect(p.x,p.y,this.config.cell,this.config.cell));
    });
  },

  moveSnake() {
    const head = this.state.snake[this.state.snake.length-1];
    let newHead = {...head};

    if (this.state.dir==="right") newHead.x+=this.config.cell;
    if (this.state.dir==="left") newHead.x-=this.config.cell;
    if (this.state.dir==="up") newHead.y-=this.config.cell;
    if (this.state.dir==="down") newHead.y+=this.config.cell;

    this.state.snake.push(newHead);
    if (!this.state.ate) {
      this.state.snake.shift();
    } else {
      this.state.ate=false;
    }
  },

  moveNPCs() {
    this.state.npcs.forEach(npc=>{
      let head = npc.body[npc.body.length-1];
      let newHead = {...head};
      if (npc.dir==="right") newHead.x+=this.config.cell;
      if (npc.dir==="left") newHead.x-=this.config.cell;
      if (npc.dir==="up") newHead.y-=this.config.cell;
      if (npc.dir==="down") newHead.y+=this.config.cell;

      if (newHead.x<0||newHead.y<0||newHead.x>=this.canvas.width||newHead.y>=this.canvas.height){
        const opp = {right:"left", left:"right", up:"down", down:"up"};
        npc.dir = opp[npc.dir];
        return;
      }

      npc.body.push(newHead);
      if (npc.body.length>5) npc.body.shift();
    });
  },

  checkEat() {
    const head = this.state.snake[this.state.snake.length-1];
    if (head.x===this.state.food.x && head.y===this.state.food.y){
      this.state.score+=10;
      this.state.food=this.randomFood();
      this.state.ate=true;
      if (this.config.npcSpawn.includes(this.state.score)) this.spawnNPC();
      this.updateUI();
    }
  },

  checkCollision() {
    const head = this.state.snake[this.state.snake.length-1];
    const wall = head.x<0||head.y<0||head.x>=this.canvas.width||head.y>=this.canvas.height;
    const self = this.state.snake.slice(0,-1).some(s=>s.x===head.x && s.y===head.y);
    const npc = this.state.npcs.some(n=>n.body.some(p=>p.x===head.x&&p.y===head.y));
    if (wall||self||npc){
      this.state.running=false;
      this.gameOver();
    }
  },

  gameOver() {
    this.saveRanking();
    $(".menu-screen").fadeIn();
    $(".final-score span").text(this.state.score);
  },

  hideGameOver() {
    $(".menu-screen").fadeOut();
  },

  updateUI() {
    $(".score--value").text(this.state.score.toString().padStart(2,"0"));
    $(".high-score span").text(localStorage.getItem("snakeHigh")||0);
    this.renderRanking();
  },

  saveRanking() {
    let r = JSON.parse(localStorage.getItem("snakeRanking"))||[];
    r.push(this.state.score);
    r.sort((a,b)=>b-a);
    r=r.slice(0,5);
    localStorage.setItem("snakeRanking",JSON.stringify(r));
    if (this.state.score>(localStorage.getItem("snakeHigh")||0)){
      localStorage.setItem("snakeHigh",this.state.score);
    }
  },

  loadRanking() {
    this.state.ranking = JSON.parse(localStorage.getItem("snakeRanking"))||[];
  },

  renderRanking() {
    if (this.state.ranking.length===0){
      $(".ranking").html("<h4>Ranking</h4><p>Nenhuma partida</p>");
      return;
    }
    let list=this.state.ranking.map((s,i)=>`<li>#${i+1}: ${s}</li>`).join("");
    $(".ranking").html(`<h4>Ranking</h4><ul>${list}</ul>`);
  },

  randomFood() {
    let pos;
    do {
      pos={x:this.randPos(), y:this.randPos(), color:this.randColor()};
    } while (this.isOccupied(pos));
    return pos;
  },

  randPos() {
    const max = this.canvas.width/this.config.cell;
    return Math.floor(Math.random()*max)*this.config.cell;
  },

  randColor() {
    return `rgb(${50+Math.random()*150},${50+Math.random()*150},${50+Math.random()*150})`;
  },

  isOccupied(pos) {
    return this.state.snake.some(s=>s.x===pos.x&&s.y===pos.y) ||
           this.state.npcs.some(n=>n.body.some(p=>p.x===pos.x&&p.y===pos.y));
  },

  spawnNPC() {
    let pos;
    do { pos={x:this.randPos(), y:this.randPos()}; }
    while(this.isOccupied(pos));
    this.state.npcs.push({
      body:[pos],
      dir:["up","down","left","right"][Math.floor(Math.random()*4)],
      color:"orange"
    });
  },

  bindEvents() {
    // teclado
    $(document).keydown(e=>{
      if (e.key==="ArrowRight" && this.state.dir!=="left") this.state.dir="right";
      if (e.key==="ArrowLeft" && this.state.dir!=="right") this.state.dir="left";
      if (e.key==="ArrowUp" && this.state.dir!=="down") this.state.dir="up";
      if (e.key==="ArrowDown" && this.state.dir!=="up") this.state.dir="down";
    });

    // swipe
    $(this.canvas).on("touchstart",e=>{
      const t=e.originalEvent.touches[0];
      this.touch={x:t.clientX,y:t.clientY};
    });

    $(this.canvas).on("touchend",e=>{
      const t=e.originalEvent.changedTouches[0];
      const dx=t.clientX-this.touch.x;
      const dy=t.clientY-this.touch.y;
      if (Math.abs(dx)>Math.abs(dy)){
        if (dx>0 && this.state.dir!=="left") this.state.dir="right";
        else if (dx<0 && this.state.dir!=="right") this.state.dir="left";
      } else {
        if (dy>0 && this.state.dir!=="up") this.state.dir="down";
        else if (dy<0 && this.state.dir!=="down") this.state.dir="up";
      }
    });

    $(".btn-play").click(()=>{
      this.hideGameOver();
      this.reset();
    });
  }
};

$(document).ready(()=>Game.init());
