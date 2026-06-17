import { WaveConfig, EnemyType, WaveEntry } from './types';

/**
 * 动态生成波次配置
 * @param totalWaves 总波次数 (1-1000)
 * 难度随波次递增：敌人数量增加、间隔缩短、重甲/快速兵比例上升
 */
export function generateWaves(totalWaves: number): WaveConfig[] {
  const waves: WaveConfig[] = [];
  const clamped = Math.max(1, Math.min(1000, Math.floor(totalWaves)));

  for (let w = 1; w <= clamped; w++) {
    const progress = w / clamped; // 0~1
    const enemies: WaveEntry[] = [];

    // 普通兵: 始终出现，数量随进度增长
    const normalCount = Math.floor(3 + progress * 20);
    const normalInterval = Math.max(200, Math.floor(1200 - progress * 900));
    enemies.push({ type: 'normal', count: normalCount, interval: normalInterval });

    // 快速兵: 第 5 波开始出现
    if (w >= 5) {
      const fastProgress = Math.min(1, (w - 5) / (clamped - 5 || 1));
      const fastCount = Math.floor(2 + fastProgress * 15);
      const fastInterval = Math.max(150, Math.floor(800 - fastProgress * 550));
      enemies.push({ type: 'fast', count: fastCount, interval: fastInterval });
    }

    // 重甲兵: 第 10 波开始出现
    if (w >= 10) {
      const heavyProgress = Math.min(1, (w - 10) / (clamped - 10 || 1));
      const heavyCount = Math.floor(1 + heavyProgress * 10);
      const heavyInterval = Math.max(400, Math.floor(1500 - heavyProgress * 800));
      enemies.push({ type: 'heavy', count: heavyCount, interval: heavyInterval });
    }

    // BOSS 波: 每 25 波一次大量重甲
    if (w % 25 === 0) {
      enemies.push({ type: 'heavy', count: Math.floor(3 + progress * 8), interval: 600 });
    }

    waves.push({ wave: w, enemies });
  }

  return waves;
}
