const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const menuOverlay = document.getElementById('menuOverlay');
const playerNameInput = document.getElementById('playerName');
const playerWeightInput = document.getElementById('playerWeight');
const btnStart = document.getElementById('btnStart');
const btnPause = document.getElementById('btnPause');
const btnChangeName = document.getElementById('btnChangeName');
const displayPlayerName = document.getElementById('displayPlayerName');
const displayWeight = document.getElementById('displayWeight');
const displayLevel = document.getElementById('displayLevel');
const displayAmmo = document.getElementById('displayAmmo');

let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, WON
let currentLevel = 1;
let playerName = "Héroe";
let playerWeight = 70;
let keys = {};

// Sistema de Munición
const maxAmmo = 12;
let currentAmmo = 12;
let isReloading = false;
let reloadTimer = 0;

// Sistema de Checkpoints
let lastCheckpoint = { level: 1, x: 50, y: 0 };

// Jugador
const player = {
  x: 100,
  y: 0,
  width: 36,
  height: 72,
  vx: 0,
  vy: 0,
  speed: 5.5,
  jumpPower: -13,
  grounded: false,
  health: 100,
  maxHealth: 100,
  shootCooldown: 0
};

// Villana Boss: Gordovihc
const boss = {
  x: 0,
  y: 0,
  baseWidth: 90,
  baseHeight: 120,
  width: 90,
  height: 120,
  vx: 0,
  vy: 0,
  grounded: false,
  health: 100,
  maxHealth: 100,
  hasHelmet: true,
  phase: 1,
  attackTimer: 0,
  jumpTimer: 0,
  eatingTimer: 0,
  obesityLevel: 1
};

let lettuces = [];
let burgers = [];
let platforms = [];
let obstacles = [];
let checkpoints = [];
let medkits = [];
let stars = [];

// Generar estrellas al fondo
for (let i = 0; i < 130; i++) {
  stars.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 2 + 1,
    alpha: Math.random()
  });
}

// Control Teclado
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (e.code === 'Space') {
    e.preventDefault();
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
      togglePause();
    }
  }

  // Recargar con 'R' en juego activo
  if (gameState === 'PLAYING' && e.code === 'KeyR' && !isReloading && currentAmmo < maxAmmo) {
    startReload();
  }

  // Reaparecer en Checkpoint con [ Space ] o pedir peso con [ T ] si muere
  if (gameState === 'GAMEOVER') {
    if (e.code === 'Space') {
      respawnAtCheckpoint();
    } else if (e.code === 'KeyT') {
      openMenuForNewRun();
    }
  }

  if (gameState === 'WON' && e.code === 'KeyR') {
    openMenuForNewRun();
  }
});

window.addEventListener('keyup', (e) => keys[e.code] = false);

btnStart.addEventListener('click', () => {
  playerName = playerNameInput.value.trim() || "Piloto Espacial";
  playerWeight = parseFloat(playerWeightInput.value) || 70;
  
  displayPlayerName.innerText = `Piloto: ${playerName}`;
  displayWeight.innerText = `Peso: ${playerWeight}kg`;
  
  menuOverlay.style.display = 'none';
  initGame();
  gameState = 'PLAYING';
  requestAnimationFrame(gameLoop);
});

btnPause.addEventListener('click', togglePause);

btnChangeName.addEventListener('click', () => {
  gameState = 'PAUSED';
  menuOverlay.style.display = 'flex';
});

function openMenuForNewRun() {
  gameState = 'MENU';
  menuOverlay.style.display = 'flex';
}

function startReload() {
  isReloading = true;
  reloadTimer = 90; // 90 frames (~1.5 segundos)
}

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    btnPause.innerText = 'Reanudar';
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    menuOverlay.style.display = 'none';
    btnPause.innerText = 'Pausar (ESPACIO)';
    requestAnimationFrame(gameLoop);
  }
}

function initGame() {
  currentLevel = 1;
  player.health = player.maxHealth;
  currentAmmo = maxAmmo;
  isReloading = false;

  // Ajustar tamaño de Gordovihc según peso
  if (playerWeight >= 50 && playerWeight < 80) {
    boss.obesityLevel = 1;
    boss.width = boss.baseWidth;
    boss.height = boss.baseHeight;
  } else if (playerWeight >= 80 && playerWeight < 100) {
    boss.obesityLevel = 2;
    boss.width = boss.baseWidth * 1.35;
    boss.height = boss.baseHeight * 1.25;
  } else if (playerWeight >= 100) {
    boss.obesityLevel = 3;
    boss.width = boss.baseWidth * 1.8;
    boss.height = boss.baseHeight * 1.5;
  } else {
    boss.obesityLevel = 1;
    boss.width = boss.baseWidth;
    boss.height = boss.baseHeight;
  }

  const floorY = canvas.height - 60;
  lastCheckpoint = { level: 1, x: 50, y: floorY - player.height };
  loadLevel(currentLevel);
}

function respawnAtCheckpoint() {
  player.health = player.maxHealth;
  currentAmmo = maxAmmo;
  isReloading = false;
  currentLevel = lastCheckpoint.level;
  loadLevel(currentLevel);
  player.x = lastCheckpoint.x;
  player.y = lastCheckpoint.y;
  gameState = 'PLAYING';
  requestAnimationFrame(gameLoop);
}

function loadLevel(level) {
  displayLevel.innerText = `Nivel: ${level}`;
  lettuces = [];
  burgers = [];
  platforms = [];
  obstacles = [];
  checkpoints = [];
  medkits = [];
  
  const floorY = canvas.height - 60;
  player.x = 50;
  player.y = floorY - player.height;
  player.vx = 0;
  player.vy = 0;

  if (level === 1) {
    platforms.push({ x: 0, y: floorY, w: canvas.width * 2, h: 60 });
    for (let i = 1; i <= 6; i++) {
      obstacles.push({ x: i * 250, y: floorY - 40, w: 40, h: 40 });
    }
    // Checkpoint Nivel 1 libre entre obstáculos
    checkpoints.push({ 
      x: 600, 
      y: floorY - 60, 
      spawnY: floorY - player.height, 
      reached: false, 
      level: 1 
    });

  } else if (level === 2) {
    platforms.push({ x: 0, y: floorY, w: 180, h: 60 });
    platforms.push({ x: 260, y: floorY - 80, w: 110, h: 30 });
    platforms.push({ x: 440, y: floorY - 160, w: 110, h: 30 });
    platforms.push({ x: 630, y: floorY - 240, w: 120, h: 30 });
    platforms.push({ x: 830, y: floorY - 140, w: 130, h: 30 });
    platforms.push({ x: 1020, y: floorY, w: 300, h: 60 }); // Plataforma final extendida

    // Checkpoint Nivel 2
    checkpoints.push({ 
      x: 670, 
      y: floorY - 300, 
      spawnY: floorY - 240 - player.height, 
      reached: false, 
      level: 2 
    });

    // Botiquín ubicado ANTES de la zona de cambio de nivel
    medkits.push({ x: 1080, y: floorY - 45, w: 30, h: 30, active: true });

  } else if (level === 3) {
    platforms.push({ x: 0, y: floorY, w: canvas.width, h: 60 });
    boss.x = canvas.width - boss.width - 50;
    boss.y = floorY - boss.height;
    boss.health = 100;
    boss.hasHelmet = true;
    boss.phase = 1;
    boss.vy = 0;
  }
}

function gameLoop() {
  if (gameState === 'PLAYING') {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  } else {
    draw();
  }
}

function update() {
  const gravity = 0.5;

  // Lógica de Recarga
  if (isReloading) {
    reloadTimer--;
    if (reloadTimer <= 0) {
      currentAmmo = maxAmmo;
      isReloading = false;
    }
  }

  if (keys['ArrowRight'] || keys['KeyD']) player.vx = player.speed;
  else if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -player.speed;
  else player.vx = 0;

  if ((keys['ArrowUp'] || keys['KeyW']) && player.grounded) {
    player.vy = player.jumpPower;
    player.grounded = false;
  }

  // Disparo con Munición Limitada
  if (player.shootCooldown > 0) player.shootCooldown--;
  if (keys['KeyP'] && player.shootCooldown === 0 && !isReloading) {
    if (currentAmmo > 0) {
      lettuces.push({
        x: player.x + player.width,
        y: player.y + 24,
        vx: 10,
        vy: 0,
        size: 10
      });
      currentAmmo--;
      player.shootCooldown = 10;
    } else {
      startReload();
    }
  }

  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Plataformas
  player.grounded = false;
  platforms.forEach(p => {
    if (
      player.x < p.x + p.w &&
      player.x + player.width > p.x &&
      player.y + player.height <= p.y + player.vy + 5 &&
      player.y + player.height >= p.y
    ) {
      player.y = p.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  });

  // Obstáculos
  obstacles.forEach(o => {
    if (
      player.x < o.x + o.w &&
      player.x + player.width > o.x &&
      player.y < o.y + o.h &&
      player.y + player.height > o.y
    ) {
      player.health -= 20;
      player.x -= 30;
      if (player.health <= 0) gameState = 'GAMEOVER';
    }
  });

  // Checkpoints
  checkpoints.forEach(cp => {
    if (
      player.x < cp.x + 30 &&
      player.x + player.width > cp.x &&
      player.y < cp.y + 60 &&
      player.y + player.height > cp.y
    ) {
      if (!cp.reached) {
        cp.reached = true;
        lastCheckpoint = { 
          level: cp.level, 
          x: cp.x, 
          y: cp.spawnY !== undefined ? cp.spawnY : (cp.y - player.height) 
        };
      }
    }
  });

  // Recoger Botiquín
  medkits.forEach(m => {
    if (
      m.active &&
      player.x < m.x + m.w &&
      player.x + player.width > m.x &&
      player.y < m.y + m.h &&
      player.y + player.height > m.y
    ) {
      m.active = false;
      player.health = player.maxHealth;
    }
  });

  if (player.y > canvas.height) {
    player.health = 0;
    gameState = 'GAMEOVER';
  }

  // Disparos
  for (let i = lettuces.length - 1; i >= 0; i--) {
    let l = lettuces[i];
    l.x += l.vx;

    if (currentLevel === 3) {
      if (
        l.x > boss.x && l.x < boss.x + boss.width &&
        l.y > boss.y && l.y < boss.y + boss.height
      ) {
        boss.health -= 3.5;
        lettuces.splice(i, 1);
        if (boss.health <= 0) {
          boss.health = 0;
          gameState = 'WON';
        }
        continue;
      }
    }

    if (l.x > canvas.width + 50) lettuces.splice(i, 1);
  }

  // Lógica de transición de niveles
  if (currentLevel === 1) {
    if (player.x > canvas.width - 50) {
      currentLevel = 2;
      loadLevel(2);
    }
  } else if (currentLevel === 2) {
    if (Math.random() < 0.08) {
      burgers.push({
        x: Math.random() * canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 4,
        radius: 12
      });
    }
    // Transición corregida: Requiere avanzar más allá del botiquín (x > 1280)
    if (player.x > 1280) {
      currentLevel = 3;
      loadLevel(3);
    }
  } else if (currentLevel === 3) {
    updateBoss();
  }

  for (let i = burgers.length - 1; i >= 0; i--) {
    let b = burgers[i];
    b.x += b.vx || 0;
    b.y += b.vy || 0;

    if (
      b.x > player.x && b.x < player.x + player.width &&
      b.y > player.y && b.y < player.y + player.height
    ) {
      player.health -= 20;
      burgers.splice(i, 1);
      if (player.health <= 0) gameState = 'GAMEOVER';
    } else if (b.y > canvas.height || b.x < -50 || b.x > canvas.width + 50) {
      burgers.splice(i, 1);
    }
  }

  // Actualizar HUD Munición
  if (isReloading) {
    displayAmmo.innerText = `Balas: Recargando...`;
  } else {
    displayAmmo.innerText = `Balas: ${currentAmmo} / ${maxAmmo}`;
  }
}

function updateBoss() {
  const floorY = canvas.height - 60;
  boss.attackTimer++;
  boss.jumpTimer++;

  if (boss.health <= 75 && boss.phase === 1) {
    boss.phase = 2;
    boss.hasHelmet = false;
    boss.eatingTimer = 50;
  }

  if (boss.eatingTimer > 0) {
    boss.eatingTimer--;
    return;
  }

  if (boss.phase === 2) {
    boss.vy += 0.5;
    boss.y += boss.vy;

    if (boss.y + boss.height >= floorY) {
      boss.y = floorY - boss.height;
      boss.vy = 0;
      boss.grounded = true;
    }

    if (boss.jumpTimer % 80 === 0 && boss.grounded) {
      boss.vy = -(8 + Math.random() * 6);
      boss.grounded = false;
    }
  }

  if (boss.phase === 1) {
    if (boss.attackTimer % 45 === 0) {
      burgers.push({
        x: boss.x - 10,
        y: boss.y + boss.height * 0.4,
        vx: -(4 + Math.random() * 4),
        vy: (Math.random() - 0.5) * 4,
        radius: 12
      });
    }
  } else {
    if (boss.attackTimer % 16 === 0) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.5;
      const spd = 5 + Math.random() * 6;
      burgers.push({
        x: boss.x - 10,
        y: boss.y + boss.height * 0.4,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: 12
      });
    }
  }
}

// --- DIBUJO ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sol Espacial
  const sunX = canvas.width - 150;
  const sunY = 120;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 140);
  sunGlow.addColorStop(0, '#fef08a');
  sunGlow.addColorStop(0.3, '#f59e0b');
  sunGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 45, 0, Math.PI * 2);
  ctx.fill();

  // Estrellas
  stars.forEach(s => {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Edificios
  ctx.fillStyle = '#0f172a';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(i * 150 + 20, canvas.height - 250, 80, 200);
  }

  // Plataformas
  platforms.forEach(p => {
    ctx.fillStyle = '#334155';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  });

  // Checkpoints (Banderas)
  checkpoints.forEach(cp => {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cp.x, cp.y, 6, 60);
    ctx.fillStyle = cp.reached ? '#22c55e' : '#eab308';
    ctx.beginPath();
    ctx.moveTo(cp.x + 6, cp.y);
    ctx.lineTo(cp.x + 36, cp.y + 15);
    ctx.lineTo(cp.x + 6, cp.y + 30);
    ctx.fill();
  });

  // Botiquín
  medkits.forEach(m => {
    if (m.active) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(m.x, m.y, m.w, m.h);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(m.x + 12, m.y + 5, 6, 20);
      ctx.fillRect(m.x + 5, m.y + 12, 20, 6);
    }
  });

  // Obstáculos
  obstacles.forEach(o => {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(o.x, o.y, o.w, o.h);
  });

  // JUGADOR
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(player.x, player.y + 20, player.width, player.height - 20);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(player.x + 4, player.y, 28, 20);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(player.x + 22, player.y + 6, 6, 6);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(player.x, player.y + player.height - 12, 16, 12);
  ctx.fillRect(player.x + 20, player.y + player.height - 12, 16, 12);

  // Pistola
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(player.x + player.width - 4, player.y + 26, 18, 8);

  // Disparos
  lettuces.forEach(l => {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // GORDOVIHC
  if (currentLevel === 3) {
    ctx.fillStyle = boss.obesityLevel === 3 ? '#9a3412' : '#ea580c';
    ctx.fillRect(boss.x, boss.y + 30, boss.width, boss.height - 30);

    if (boss.obesityLevel >= 2) {
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(boss.x - 10, boss.y + boss.height * 0.4, boss.width + 20, 20);
    }
    if (boss.obesityLevel === 3) {
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(boss.x - 20, boss.y + boss.height * 0.6, boss.width + 40, 25);
    }

    if (boss.hasHelmet) {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(boss.x + boss.width * 0.15, boss.y, boss.width * 0.7, 35);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(boss.x + boss.width * 0.25, boss.y + 8, boss.width * 0.5, 20);
    } else {
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(boss.x + boss.width * 0.2, boss.y, boss.width * 0.6, 35);

      ctx.fillStyle = '#000';
      ctx.fillRect(boss.x + boss.width * 0.3, boss.y + 10, 6, 6);
      ctx.fillRect(boss.x + boss.width * 0.5, boss.y + 10, 6, 6);

      if (boss.obesityLevel >= 2) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(boss.x + boss.width * 0.38, boss.y + 20, 5, 15);
        ctx.fillRect(boss.x + boss.width * 0.46, boss.y + 20, 4, 22);
      }

      if (boss.eatingTimer > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('🍔 ¡Comiendo!', boss.x - 10, boss.y - 10);
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`GORDOVIHC (${playerWeight}kg)`, canvas.width - 260, 40);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(canvas.width - 260, 50, (boss.health / boss.maxHealth) * 200, 14);
  }

  // Hamburguesas
  burgers.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  });

  // HUD
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Vida de ${playerName}: ${Math.max(0, player.health)}%`, 20, 80);
  ctx.fillStyle = player.health < 20 ? '#ef4444' : '#22c55e';
  ctx.fillRect(20, 90, Math.max(0, player.health) * 2, 10);

  if (currentAmmo === 0 && !isReloading) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('¡SIN BALAS! Presiona [ R ] para recargar', 20, 120);
  }

  // Pantalla de Derrota
  if (gameState === 'GAMEOVER') {
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('jaja perdiste ahora vas a tener diabetes tipo 5', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = '#38bdf8';
    ctx.font = '18px sans-serif';
    ctx.fillText('Presiona [ ESPACIO ] para reaparecer en el Checkpoint', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Presiona [ T ] para cambiar de peso en el Menú Principal', canvas.width / 2, canvas.height / 2 + 60);
    ctx.textAlign = 'left';
  } 
  
  // Pantalla de Victoria
  else if (gameState === 'WON') {
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`¡VICTORIA DE ${playerName.toUpperCase()}!`, canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = '#f8fafc';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Derrotaste a la versión de ${playerWeight}kg de Gordovihc.`, canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.fillStyle = '#38bdf8';
    ctx.font = '20px sans-serif';
    ctx.fillText('Presiona [ R ] para ingresar tu peso y reiniciar', canvas.width / 2, canvas.height / 2 + 60);
    ctx.textAlign = 'left';
  }
}