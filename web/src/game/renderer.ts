import {
  GameState, Enemy, Tower, Projectile, Particle, Point,
  CELL_SIZE, GRID_COLS, GRID_ROWS, CANVAS_WIDTH, CANVAS_HEIGHT, TowerType,
} from './types';
import { TOWER_DEFS } from './towers';

let frameTime = 0;

export function render(
  ctx: CanvasRenderingContext2D, state: GameState, path: Point[],
  pathCells: Set<string>, mouseGrid: { x: number; y: number } | null,
) {
  frameTime = performance.now() / 1000;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawGrid(ctx, pathCells);
  drawPath(ctx, path);
  for (const t of state.towers) drawTower(ctx, t);
  if (state.selectedPlacedTower) {
    const t = state.selectedPlacedTower;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
    ctx.strokeRect(t.x - CELL_SIZE / 2 + 2, t.y - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }
  for (const e of state.enemies) if (e.alive) drawEnemy(ctx, e);
  for (const p of state.projectiles) drawProjectile(ctx, p);
  for (const p of state.particles) drawParticle(ctx, p);
  if (mouseGrid && state.selectedTower && state.status === 'playing') {
    const ok = !pathCells.has(`${mouseGrid.x},${mouseGrid.y}`) &&
      !state.towers.some(t => t.gridX === mouseGrid.x && t.gridY === mouseGrid.y);
    const def = TOWER_DEFS[state.selectedTower];
    const px = mouseGrid.x * CELL_SIZE + CELL_SIZE / 2, py = mouseGrid.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.globalAlpha = 0.4; ctx.fillStyle = ok ? def.color : '#f00';
    ctx.fillRect(mouseGrid.x * CELL_SIZE + 2, mouseGrid.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    ctx.beginPath(); ctx.arc(px, py, def.range, 0, Math.PI * 2);
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawHUD(ctx, state);
  if (state.status === 'won' || state.status === 'lost') drawOverlay(ctx, state);
}

function drawGrid(ctx: CanvasRenderingContext2D, pathCells: Set<string>) {
  for (let y = 0; y < GRID_ROWS; y++) for (let x = 0; x < GRID_COLS; x++) {
    ctx.fillStyle = pathCells.has(`${x},${y}`) ? '#4a3728' : '#2d5a27';
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
}

function drawPath(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(path[0].x * CELL_SIZE + CELL_SIZE / 2, path[0].y * CELL_SIZE + CELL_SIZE / 2);
  for (let i = 1; i < path.length; i++)
    ctx.lineTo(path[i].x * CELL_SIZE + CELL_SIZE / 2, path[i].y * CELL_SIZE + CELL_SIZE / 2);
  ctx.strokeStyle = '#a08050'; ctx.lineWidth = CELL_SIZE * 0.7;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(path[0].x * CELL_SIZE + CELL_SIZE / 2, path[0].y * CELL_SIZE + CELL_SIZE / 2);
  for (let i = 1; i < path.length; i++)
    ctx.lineTo(path[i].x * CELL_SIZE + CELL_SIZE / 2, path[i].y * CELL_SIZE + CELL_SIZE / 2);
  ctx.strokeStyle = '#c4a265'; ctx.lineWidth = CELL_SIZE * 0.5; ctx.stroke();
  // 起终点
  const s = path[0], e = path[path.length - 1];
  ctx.shadowBlur = 10; ctx.shadowColor = '#22c55e'; ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.arc(s.x * CELL_SIZE + CELL_SIZE / 2, s.y * CELL_SIZE + CELL_SIZE / 2, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(e.x * CELL_SIZE + CELL_SIZE / 2, e.y * CELL_SIZE + CELL_SIZE / 2, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower) {
  const cx = tower.x, cy = tower.y, s = CELL_SIZE - 6;
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(cx - s / 2 + 2, cy - s / 2 + 2, s, s);
  ctx.fillStyle = '#1f2937'; ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
  ctx.fillStyle = tower.def.color; ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(cx, cy, s / 2 - 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(tower.level > 1 ? `${tower.level}` : tower.def.type === 'arrow' ? '↑' : tower.def.type === 'cannon' ? '●' : '❄', cx, cy);
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const { x, y, def, hp, maxHp, slowTimer, hitFlash } = enemy;
  const s = def.size;
  const bodyColor = hitFlash > 0 ? '#ffffff' : slowTimer > 0 ? '#93c5fd' : def.color;
  ctx.save();
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x + 2, y + 3, s * 0.7, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();

  if (def.type === 'normal') {
    ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = def.colorDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = def.colorDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - s * 0.4, y); ctx.lineTo(x + s * 0.4, y);
    ctx.moveTo(x, y - s * 0.4); ctx.lineTo(x, y + s * 0.4); ctx.stroke();
  } else if (def.type === 'fast') {
    const bob = Math.sin(frameTime * 10) * 2;
    ctx.fillStyle = bodyColor; ctx.beginPath();
    ctx.moveTo(x, y - s + bob); ctx.lineTo(x - s, y + s * 0.7 + bob); ctx.lineTo(x + s, y + s * 0.7 + bob);
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = def.colorDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 3, y + bob, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, y + bob, 2, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = bodyColor; ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + s * Math.cos(a), py = y + s * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = def.colorDark; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = def.colorDark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.3); ctx.lineTo(x + s * 0.5, y - s * 0.3);
    ctx.moveTo(x - s * 0.5, y + s * 0.3); ctx.lineTo(x + s * 0.5, y + s * 0.3); ctx.stroke();
  }

  if (slowTimer > 0) {
    ctx.strokeStyle = 'rgba(147,197,253,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + frameTime * 2;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (s + 4), y + Math.sin(a) * (s + 4)); ctx.stroke();
    }
  }
  ctx.restore();

  // 血条
  const bw = s * 2.2, bh = 4, bx = x - bw / 2, by = y - s - 10;
  ctx.fillStyle = '#0f172a'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#374151'; ctx.fillRect(bx, by, bw, bh);
  const ratio = hp / maxHp;
  ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(bx, by, bw * ratio, bh);
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const c: Record<TowerType, [string, string]> = {
    arrow: ['#86efac', '#22c55e'], cannon: ['#fca5a5', '#dc2626'], ice: ['#93c5fd', '#3b82f6'],
  };
  const [inner, outer] = c[proj.towerType];
  const sz = proj.towerType === 'cannon' ? 5 : 3;
  ctx.shadowColor = inner; ctx.shadowBlur = 8; ctx.fillStyle = inner;
  ctx.beginPath(); ctx.arc(proj.x, proj.y, sz, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = outer; ctx.beginPath(); ctx.arc(proj.x, proj.y, sz * 0.5, 0, Math.PI * 2); ctx.fill();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.globalAlpha = p.kind === 'smoke' ? alpha * 0.4 : alpha;
  if (p.kind === 'explosion') {
    ctx.shadowColor = p.color; ctx.shadowBlur = 6;
  }
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, CANVAS_HEIGHT - 32, CANVAS_WIDTH, 32);
  ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fbbf24'; ctx.fillText(`金币: ${state.gold}`, 10, CANVAS_HEIGHT - 16);
  ctx.fillStyle = '#f87171'; ctx.fillText(`生命: ${state.lives}/${state.maxLives}`, 130, CANVAS_HEIGHT - 16);
  ctx.fillStyle = '#a5b4fc'; ctx.fillText(`波次: ${state.currentWave}/${state.totalWaves}`, 260, CANVAS_HEIGHT - 16);
  ctx.fillStyle = '#e2e8f0'; ctx.fillText(`得分: ${state.score}`, 400, CANVAS_HEIGHT - 16);
  if (state.speedMultiplier !== 1) {
    ctx.fillStyle = '#fbbf24'; ctx.fillText(`${state.speedMultiplier}x`, 520, CANVAS_HEIGHT - 16);
  }
  if (state.status === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('暂停中', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = state.status === 'won' ? '#22c55e' : '#ef4444';
  ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(state.status === 'won' ? '胜利!' : '失败!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '20px sans-serif';
  ctx.fillText(`最终得分: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}
