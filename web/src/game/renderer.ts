import {
  GameState, Enemy, Tower, Projectile, Point,
  CELL_SIZE, GRID_COLS, GRID_ROWS, CANVAS_WIDTH, CANVAS_HEIGHT,
  TowerType,
} from './types';
import { TOWER_DEFS } from './towers';

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  path: Point[],
  pathCells: Set<string>,
  mouseGrid: { x: number; y: number } | null,
) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 背景网格
  drawGrid(ctx, pathCells);

  // 路径
  drawPath(ctx, path);

  // 塔
  for (const tower of state.towers) {
    drawTower(ctx, tower);
  }

  // 选中塔的射程
  if (state.selectedPlacedTower) {
    const t = state.selectedPlacedTower;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 敌人
  for (const enemy of state.enemies) {
    if (enemy.alive) drawEnemy(ctx, enemy);
  }

  // 弹道
  for (const proj of state.projectiles) {
    drawProjectile(ctx, proj);
  }

  // 鼠标预览（放塔）
  if (mouseGrid && state.selectedTower && state.status === 'playing') {
    const canPlace = !pathCells.has(`${mouseGrid.x},${mouseGrid.y}`) &&
      !state.towers.some(t => t.gridX === mouseGrid.x && t.gridY === mouseGrid.y);
    const def = TOWER_DEFS[state.selectedTower];
    const px = mouseGrid.x * CELL_SIZE + CELL_SIZE / 2;
    const py = mouseGrid.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = canPlace ? def.color : '#ff0000';
    ctx.fillRect(mouseGrid.x * CELL_SIZE + 2, mouseGrid.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.beginPath();
    ctx.arc(px, py, def.range, 0, Math.PI * 2);
    ctx.strokeStyle = canPlace ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // HUD
  drawHUD(ctx, state);

  // 游戏结束覆盖
  if (state.status === 'won' || state.status === 'lost') {
    drawOverlay(ctx, state);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, pathCells: Set<string>) {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const isPath = pathCells.has(`${x},${y}`);
      ctx.fillStyle = isPath ? '#4a3728' : '#2d5a27';
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(path[0].x * CELL_SIZE + CELL_SIZE / 2, path[0].y * CELL_SIZE + CELL_SIZE / 2);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x * CELL_SIZE + CELL_SIZE / 2, path[i].y * CELL_SIZE + CELL_SIZE / 2);
  }
  ctx.strokeStyle = '#c4a265';
  ctx.lineWidth = CELL_SIZE * 0.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 起点标记
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(path[0].x * CELL_SIZE + CELL_SIZE / 2, path[0].y * CELL_SIZE + CELL_SIZE / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // 终点标记
  const end = path[path.length - 1];
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(end.x * CELL_SIZE + CELL_SIZE / 2, end.y * CELL_SIZE + CELL_SIZE / 2, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower) {
  const cx = tower.x;
  const cy = tower.y;
  const s = CELL_SIZE - 8;

  // 底座
  ctx.fillStyle = '#374151';
  ctx.fillRect(cx - s / 2, cy - s / 2, s, s);

  // 塔身
  ctx.fillStyle = tower.def.color;
  ctx.beginPath();
  ctx.arc(cx, cy, s / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // 等级指示
  if (tower.level > 1) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★${tower.level}`, cx, cy);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const { x, y, def, hp, maxHp, slowTimer } = enemy;

  // 敌人身体
  ctx.fillStyle = slowTimer > 0 ? '#93c5fd' : def.color;
  ctx.beginPath();
  ctx.arc(x, y, def.size, 0, Math.PI * 2);
  ctx.fill();

  // 血条
  const barWidth = def.size * 2;
  const barHeight = 4;
  const barX = x - barWidth / 2;
  const barY = y - def.size - 8;
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = hp / maxHp > 0.5 ? '#22c55e' : hp / maxHp > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(barX, barY, barWidth * (hp / maxHp), barHeight);
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.fillStyle = proj.towerType === 'arrow' ? '#86efac' :
    proj.towerType === 'cannon' ? '#fca5a5' : '#93c5fd';
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  // 底部信息栏背景
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, CANVAS_HEIGHT - 32, CANVAS_WIDTH, 32);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`金币: ${state.gold}`, 10, CANVAS_HEIGHT - 16);

  ctx.fillStyle = '#f87171';
  ctx.fillText(`生命: ${state.lives}/${state.maxLives}`, 130, CANVAS_HEIGHT - 16);

  ctx.fillStyle = '#a5b4fc';
  ctx.fillText(`波次: ${state.currentWave}/${state.totalWaves}`, 260, CANVAS_HEIGHT - 16);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`得分: ${state.score}`, 400, CANVAS_HEIGHT - 16);

  if (state.status === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂停中', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = state.status === 'won' ? '#22c55e' : '#ef4444';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.status === 'won' ? '胜利!' : '失败!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '20px sans-serif';
  ctx.fillText(`最终得分: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}
