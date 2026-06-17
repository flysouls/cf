// 游戏类型定义

export interface Point {
  x: number;
  y: number;
}

export type EnemyType = 'normal' | 'fast' | 'heavy';
export type TowerType = 'arrow' | 'cannon' | 'ice';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'won' | 'lost';

export interface EnemyDef {
  type: EnemyType;
  hp: number;
  speed: number; // 像素/秒
  reward: number;
  color: string;
  size: number;
}

export interface TowerDef {
  type: TowerType;
  cost: number;
  damage: number;
  range: number;  // 像素
  fireRate: number; // 每秒攻击次数
  color: string;
  splash?: number; // 溅射半径
  slow?: number;   // 减速百分比
  slowDuration?: number;
  upgradeCost: number;
  upgradeDamageBonus: number;
  upgradeRangeBonus: number;
}

export interface Enemy {
  id: number;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  pathIndex: number; // 当前路径点索引
  pathProgress: number; // 0~1 在两点之间的进度
  speed: number;
  slowTimer: number;
  alive: boolean;
}

export interface Tower {
  id: number;
  def: TowerDef;
  gridX: number;
  gridY: number;
  x: number; // 中心像素坐标
  y: number;
  level: number;
  cooldown: number;
  damage: number;
  range: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  speed: number;
  damage: number;
  splash?: number;
  slow?: number;
  slowDuration?: number;
  towerType: TowerType;
}

export interface WaveEntry {
  type: EnemyType;
  count: number;
  interval: number; // ms between spawns
}

export interface WaveConfig {
  wave: number;
  enemies: WaveEntry[];
}

export interface GameState {
  status: GameStatus;
  gold: number;
  lives: number;
  maxLives: number;
  score: number;
  currentWave: number;
  totalWaves: number;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  waveConfig: WaveConfig[];
  waveSpawnTimer: number;
  waveEnemyQueue: { type: EnemyType; delay: number }[];
  selectedTower: TowerType | null;
  selectedPlacedTower: Tower | null;
  nextId: number;
}

export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_SIZE = 40;
export const CANVAS_WIDTH = GRID_COLS * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE;
