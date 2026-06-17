import { Projectile, Enemy, CELL_SIZE } from './types';

export function updateProjectiles(
  projectiles: Projectile[],
  enemies: Enemy[],
  dt: number
): { projectiles: Projectile[]; hits: { proj: Projectile; enemy: Enemy }[] } {
  const hits: { proj: Projectile; enemy: Enemy }[] = [];
  const remaining: Projectile[] = [];

  for (const proj of projectiles) {
    const target = enemies.find(e => e.id === proj.targetId && e.alive);
    if (!target) {
      // 目标已死，移除弹道
      continue;
    }

    const dx = target.x - proj.x;
    const dy = target.y - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = proj.speed * dt;

    if (dist <= moveSpeed + 5) {
      // 命中
      hits.push({ proj, enemy: target });
    } else {
      // 移动向目标
      proj.x += (dx / dist) * moveSpeed;
      proj.y += (dy / dist) * moveSpeed;
      remaining.push(proj);
    }
  }

  return { projectiles: remaining, hits };
}

export function applyDamage(
  enemies: Enemy[],
  enemy: Enemy,
  damage: number,
  splash?: number,
  slow?: number,
  slowDuration?: number,
): { killed: Enemy[]; goldEarned: number } {
  const killed: Enemy[] = [];
  let goldEarned = 0;

  // 直接伤害
  enemy.hp -= damage;
  if (slow && slowDuration) {
    enemy.speed = enemy.def.speed * (1 - slow);
    enemy.slowTimer = slowDuration;
  }
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    killed.push(enemy);
    goldEarned += enemy.def.reward;
  }

  // 溅射伤害
  if (splash) {
    for (const other of enemies) {
      if (other.id === enemy.id || !other.alive) continue;
      const dx = other.x - enemy.x;
      const dy = other.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= splash) {
        other.hp -= damage * 0.5;
        if (slow && slowDuration) {
          other.speed = other.def.speed * (1 - slow);
          other.slowTimer = slowDuration;
        }
        if (other.hp <= 0 && other.alive) {
          other.alive = false;
          killed.push(other);
          goldEarned += other.def.reward;
        }
      }
    }
  }

  return { killed, goldEarned };
}
