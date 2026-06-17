import { EnemyDef, EnemyType } from './types';

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  normal: {
    type: 'normal',
    hp: 80,
    speed: 40,
    reward: 10,
    color: '#f97316',
    colorDark: '#c2410c',
    size: 12,
  },
  fast: {
    type: 'fast',
    hp: 40,
    speed: 80,
    reward: 15,
    color: '#a855f7',
    colorDark: '#7c3aed',
    size: 10,
  },
  heavy: {
    type: 'heavy',
    hp: 250,
    speed: 25,
    reward: 25,
    color: '#dc2626',
    colorDark: '#991b1b',
    size: 16,
  },
};

export function getEnemyDef(type: EnemyType): EnemyDef {
  return ENEMY_DEFS[type];
}
