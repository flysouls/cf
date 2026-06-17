import { Point, GRID_COLS, GRID_ROWS } from './types';

// 蛇形路径定义 - 从左到右蛇形穿行
// 路径用网格坐标表示，敌人沿路径点移动

export function generatePath(): Point[] {
  const path: Point[] = [];
  // 蛇形路线：行 1,3,5,7,9,11,13
  const rows = [1, 3, 5, 7, 9, 11, 13];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i % 2 === 0) {
      // 从左到右
      for (let col = 0; col < GRID_COLS; col++) {
        path.push({ x: col, y: row });
      }
    } else {
      // 从右到左
      for (let col = GRID_COLS - 1; col >= 0; col--) {
        path.push({ x: col, y: row });
      }
    }
    // 向下连接到下一行
    if (i < rows.length - 1) {
      const nextRow = rows[i + 1];
      const lastCol = i % 2 === 0 ? GRID_COLS - 1 : 0;
      for (let r = row + 1; r < nextRow; r++) {
        path.push({ x: lastCol, y: r });
      }
    }
  }
  return path;
}

// 路径占用的格子集合 (用于禁止放塔)
export function getPathCells(path: Point[]): Set<string> {
  const set = new Set<string>();
  path.forEach(p => set.add(`${p.x},${p.y}`));
  return set;
}
