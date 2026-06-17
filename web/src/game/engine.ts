import {
  GameState, GameStatus, Enemy, Tower, Projectile, Particle, ParticleKind,
  Point, TowerType, EnemyType,
  CELL_SIZE, GRID_COLS, GRID_ROWS, CANVAS_WIDTH, CANVAS_HEIGHT,
  WaveConfig,
} from './types';
import { generatePath, getPathCells } from './map';
import { TOWER_DEFS, getTowerDef } from './towers';
import { getEnemyDef } from './enemies';
import { updateProjectiles, applyDamage } from './projectiles';
import { render } from './renderer';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: GameState;
  path: Point[];
  pathCells: Set<string>;
  mouseGrid: { x: number; y: number } | null = null;
  animFrameId: number = 0;
  lastTime: number = 0;
  onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement, waveConfig?: WaveConfig[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.path = generatePath();
    this.pathCells = getPathCells(this.path);

    const defaultWaves: WaveConfig[] = [
      { wave: 1, enemies: [{ type: 'normal', count: 5, interval: 1000 }] },
      { wave: 2, enemies: [{ type: 'normal', count: 8, interval: 800 }, { type: 'fast', count: 3, interval: 600 }] },
      { wave: 3, enemies: [{ type: 'normal', count: 10, interval: 700 }, { type: 'fast', count: 5, interval: 500 }] },
      { wave: 4, enemies: [{ type: 'heavy', count: 3, interval: 1200 }, { type: 'normal', count: 8, interval: 600 }] },
      { wave: 5, enemies: [{ type: 'heavy', count: 5, interval: 1000 }, { type: 'fast', count: 8, interval: 400 }, { type: 'normal', count: 10, interval: 500 }] },
    ];

    const waves = waveConfig && waveConfig.length > 0 ? waveConfig : defaultWaves;

    this.state = {
      status: 'idle',
      gold: 200,
      lives: 10,
      maxLives: 10,
      score: 0,
      currentWave: 0,
      totalWaves: waves.length,
      enemies: [],
      towers: [],
      projectiles: [],
      particles: [],
      waveConfig: waves,
      waveSpawnTimer: 0,
      waveEnemyQueue: [],
      selectedTower: null,
      selectedPlacedTower: null,
      speedMultiplier: 1,
      nextId: 1,
    };

    canvas.addEventListener('click', this.handleClick);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseleave', () => { this.mouseGrid = null; });
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }

  start() {
    if (this.state.status !== 'idle') return;
    this.state.status = 'playing';
    this.startNextWave();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  togglePause() {
    if (this.state.status === 'playing') {
      this.state.status = 'paused';
    } else if (this.state.status === 'paused') {
      this.state.status = 'playing';
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
    this.emitStateImmediate();
  }

  setSpeed(multiplier: number) {
    this.state.speedMultiplier = multiplier;
    this.emitStateImmediate();
  }

  selectTowerType(type: TowerType | null) {
    this.state.selectedTower = type;
    this.state.selectedPlacedTower = null;
    this.emitStateImmediate();
  }

  upgradeTower(tower: Tower) {
    const cost = tower.def.upgradeCost * tower.level;
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    tower.level += 1;
    tower.damage += tower.def.upgradeDamageBonus;
    tower.range += tower.def.upgradeRangeBonus;
    this.emitStateImmediate();
    return true;
  }

  sellTower(tower: Tower) {
    const refund = Math.floor(tower.def.cost * 0.6 + tower.def.upgradeCost * (tower.level - 1) * 0.4);
    this.state.gold += refund;
    this.state.towers = this.state.towers.filter(t => t.id !== tower.id);
    this.state.selectedPlacedTower = null;
    this.emitStateImmediate();
  }

  // 从保存的数据恢复游戏状态
  restoreState(data: { gold: number; lives: number; score: number; wave_reached: number; towers_placed: any[] }) {
    const s = this.state;
    s.gold = data.gold || 200;
    s.lives = data.lives || 10;
    s.score = data.score || 0;
    s.currentWave = data.wave_reached || 0;

    // 恢复塔
    if (data.towers_placed && Array.isArray(data.towers_placed)) {
      for (const td of data.towers_placed) {
        const def = TOWER_DEFS[td.type as TowerType];
        if (!def) continue;
        const level = td.level || 1;
        const tower: Tower = {
          id: this.nextId(),
          def,
          gridX: td.gridX,
          gridY: td.gridY,
          x: td.gridX * CELL_SIZE + CELL_SIZE / 2,
          y: td.gridY * CELL_SIZE + CELL_SIZE / 2,
          level,
          cooldown: 0,
          damage: def.damage + def.upgradeDamageBonus * (level - 1),
          range: def.range + def.upgradeRangeBonus * (level - 1),
        };
        s.towers.push(tower);
      }
    }

    // 从下一波开始
    if (s.currentWave >= s.totalWaves) {
      s.currentWave = s.totalWaves - 1; // 确保还能打最后一波
    }

    this.emitStateImmediate();
  }

  private nextId(): number {
    return this.state.nextId++;
  }

  private startNextWave() {
    if (this.state.currentWave >= this.state.totalWaves) {
      if (this.state.enemies.filter(e => e.alive).length === 0) {
        this.state.status = 'won';
        this.emitStateImmediate();
      }
      return;
    }

    const waveCfg = this.state.waveConfig[this.state.currentWave];
    this.state.currentWave++;

    const queue: { type: EnemyType; delay: number }[] = [];
    let totalDelay = 0;
    for (const entry of waveCfg.enemies) {
      for (let i = 0; i < entry.count; i++) {
        queue.push({ type: entry.type, delay: totalDelay });
        totalDelay += entry.interval;
      }
    }
    queue.sort((a, b) => a.delay - b.delay);
    this.state.waveEnemyQueue = queue;
    this.state.waveSpawnTimer = 0;
  }

  private spawnEnemy(type: EnemyType) {
    const def = getEnemyDef(type);
    const start = this.path[0];
    const enemy: Enemy = {
      id: this.nextId(),
      def,
      hp: def.hp,
      maxHp: def.hp,
      x: start.x * CELL_SIZE + CELL_SIZE / 2,
      y: start.y * CELL_SIZE + CELL_SIZE / 2,
      pathIndex: 0,
      pathProgress: 0,
      speed: def.speed,
      slowTimer: 0,
      alive: true,
      hitFlash: 0,
    };
    this.state.enemies.push(enemy);
  }

  // 粒子生成
  private spawnParticles(x: number, y: number, count: number, kind: ParticleKind, baseColor: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = kind === 'explosion' ? 40 + Math.random() * 120 :
                    kind === 'spark' ? 60 + Math.random() * 80 :
                    kind === 'smoke' ? 10 + Math.random() * 30 :
                    30 + Math.random() * 60;
      const life = kind === 'explosion' ? 0.4 + Math.random() * 0.6 :
                   kind === 'smoke' ? 0.8 + Math.random() * 0.5 :
                   kind === 'spark' ? 0.2 + Math.random() * 0.3 :
                   0.3 + Math.random() * 0.3;
      const size = kind === 'explosion' ? 3 + Math.random() * 5 :
                   kind === 'smoke' ? 6 + Math.random() * 8 :
                   kind === 'spark' ? 2 + Math.random() * 3 :
                   2 + Math.random() * 3;
      this.state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        size, color: baseColor, kind,
        gravity: kind === 'smoke' ? -30 : kind === 'explosion' ? 80 : 40,
      });
    }
  }

  private loop = (time: number) => {
    if (this.state.status !== 'playing') {
      render(this.ctx, this.state, this.path, this.pathCells, this.mouseGrid);
      return;
    }

    const rawDt = Math.min((time - this.lastTime) / 1000, 0.1);
    const dt = rawDt * this.state.speedMultiplier;
    this.lastTime = time;

    this.update(dt);
    render(this.ctx, this.state, this.path, this.pathCells, this.mouseGrid);
    this.emitState();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const s = this.state;

    // 0. 粒子更新（始终执行）
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        s.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }

    // 敌人 hitFlash 衰减
    for (const enemy of s.enemies) {
      if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    }

    // 1. 敌人生成
    if (s.waveEnemyQueue.length > 0) {
      s.waveSpawnTimer += dt * 1000;
      while (s.waveEnemyQueue.length > 0 && s.waveSpawnTimer >= s.waveEnemyQueue[0].delay) {
        const entry = s.waveEnemyQueue.shift()!;
        this.spawnEnemy(entry.type);
      }
    }

    // 2. 敌人移动
    for (const enemy of s.enemies) {
      if (!enemy.alive) continue;

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        if (enemy.slowTimer <= 0) {
          enemy.speed = enemy.def.speed;
        }
      }

      if (enemy.pathIndex < this.path.length - 1) {
        const from = this.path[enemy.pathIndex];
        const to = this.path[enemy.pathIndex + 1];
        const fx = from.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = from.y * CELL_SIZE + CELL_SIZE / 2;
        const tx = to.x * CELL_SIZE + CELL_SIZE / 2;
        const ty = to.y * CELL_SIZE + CELL_SIZE / 2;

        const segDx = tx - fx;
        const segDy = ty - fy;
        const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
        const moveAmount = enemy.speed * dt;

        enemy.pathProgress += moveAmount / segLen;

        if (enemy.pathProgress >= 1) {
          enemy.pathIndex++;
          enemy.pathProgress = 0;
          if (enemy.pathIndex >= this.path.length - 1) {
            enemy.alive = false;
            s.lives--;
            if (s.lives <= 0) {
              s.status = 'lost';
              return;
            }
          }
        }

        if (enemy.pathIndex < this.path.length - 1) {
          const cf = this.path[enemy.pathIndex];
          const ct = this.path[enemy.pathIndex + 1];
          const cfx = cf.x * CELL_SIZE + CELL_SIZE / 2;
          const cfy = cf.y * CELL_SIZE + CELL_SIZE / 2;
          const ctx2 = ct.x * CELL_SIZE + CELL_SIZE / 2;
          const cty = ct.y * CELL_SIZE + CELL_SIZE / 2;
          enemy.x = cfx + (ctx2 - cfx) * enemy.pathProgress;
          enemy.y = cfy + (cty - cfy) * enemy.pathProgress;
        }
      }
    }

    // 3. 塔攻击
    for (const tower of s.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown <= 0) {
        let closest: Enemy | null = null;
        let closestDist = Infinity;
        for (const enemy of s.enemies) {
          if (!enemy.alive) continue;
          const dx = enemy.x - tower.x;
          const dy = enemy.y - tower.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= tower.range && dist < closestDist) {
            closest = enemy;
            closestDist = dist;
          }
        }
        if (closest) {
          tower.cooldown = 1 / tower.def.fireRate;
          const proj: Projectile = {
            id: this.nextId(),
            x: tower.x,
            y: tower.y,
            targetId: closest.id,
            speed: 300,
            damage: tower.damage,
            splash: tower.def.splash,
            slow: tower.def.slow,
            slowDuration: tower.def.slowDuration,
            towerType: tower.def.type,
          };
          s.projectiles.push(proj);
        }
      }
    }

    // 4. 弹道更新
    const projResult = updateProjectiles(s.projectiles, s.enemies, dt);
    s.projectiles = projResult.projectiles;

    // 5. 命中处理 + 特效
    for (const hit of projResult.hits) {
      const result = applyDamage(
        s.enemies,
        hit.enemy,
        hit.proj.damage,
        hit.proj.splash,
        hit.proj.slow,
        hit.proj.slowDuration,
      );
      s.gold += result.goldEarned;
      s.score += result.killed.length * 10;

      // 受击闪白
      if (hit.enemy.alive) {
        hit.enemy.hitFlash = 0.08;
      }

      // 命中火花
      const hitColor = hit.proj.towerType === 'arrow' ? '#86efac' :
                       hit.proj.towerType === 'cannon' ? '#fca5a5' : '#93c5fd';
      this.spawnParticles(hit.enemy.x, hit.enemy.y, 4, 'spark', hitColor);

      // 击杀爆炸
      for (const killed of result.killed) {
        this.spawnParticles(killed.x, killed.y, 15, 'explosion', killed.def.color);
        this.spawnParticles(killed.x, killed.y, 6, 'smoke', '#6b7280');
      }

      // 炮塔溅射爆炸特效
      if (hit.proj.splash) {
        this.spawnParticles(hit.enemy.x, hit.enemy.y, 12, 'explosion', '#fbbf24');
      }
    }

    // 6. 清理死亡敌人
    s.enemies = s.enemies.filter(e => e.alive);

    // 7. 检查波次完成
    if (s.waveEnemyQueue.length === 0 && s.enemies.filter(e => e.alive).length === 0) {
      if (s.currentWave >= s.totalWaves) {
        s.status = 'won';
      } else {
        this.startNextWave();
      }
    }
  }

  private handleClick = (e: MouseEvent) => {
    if (this.state.status !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const gx = Math.floor(mx / CELL_SIZE);
    const gy = Math.floor(my / CELL_SIZE);

    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return;

    if (this.state.selectedTower) {
      const def = getTowerDef(this.state.selectedTower);
      if (this.state.gold < def.cost) return;
      if (this.pathCells.has(`${gx},${gy}`)) return;
      if (this.state.towers.some(t => t.gridX === gx && t.gridY === gy)) return;

      const tower: Tower = {
        id: this.nextId(),
        def,
        gridX: gx,
        gridY: gy,
        x: gx * CELL_SIZE + CELL_SIZE / 2,
        y: gy * CELL_SIZE + CELL_SIZE / 2,
        level: 1,
        cooldown: 0,
        damage: def.damage,
        range: def.range,
      };
      this.state.towers.push(tower);
      this.state.gold -= def.cost;
      // 放塔特效
      this.spawnParticles(tower.x, tower.y, 8, 'spark', def.color);
      this.emitStateImmediate();
      return;
    }

    const clicked = this.state.towers.find(t => t.gridX === gx && t.gridY === gy);
    if (clicked) {
      this.state.selectedPlacedTower = this.state.selectedPlacedTower?.id === clicked.id ? null : clicked;
    } else {
      this.state.selectedPlacedTower = null;
    }
    this.emitStateImmediate();
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    this.mouseGrid = {
      x: Math.floor(mx / CELL_SIZE),
      y: Math.floor(my / CELL_SIZE),
    };
  };

  private emitTimer: number = 0;

  private emitState() {
    const now = performance.now();
    if (now - this.emitTimer < 200) return;
    this.emitTimer = now;
    this.onStateChange?.({ ...this.state });
  }

  private emitStateImmediate() {
    this.emitTimer = performance.now();
    this.onStateChange?.({ ...this.state });
  }

  getSnapshot() {
    const s = this.state;
    return {
      status: s.status,
      gold: s.gold,
      lives: s.lives,
      maxLives: s.maxLives,
      score: s.score,
      currentWave: s.currentWave,
      totalWaves: s.totalWaves,
      towers: this.getTowersData(),
    };
  }

  getTowersData() {
    return this.state.towers.map(t => ({
      type: t.def.type,
      gridX: t.gridX,
      gridY: t.gridY,
      level: t.level,
    }));
  }
}
