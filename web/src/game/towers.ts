import { TowerDef, TowerType } from './types';

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  arrow: {
    type: 'arrow',
    cost: 50,
    damage: 15,
    range: 120,
    fireRate: 2,
    color: '#22c55e',
    upgradeCost: 40,
    upgradeDamageBonus: 10,
    upgradeRangeBonus: 20,
  },
  cannon: {
    type: 'cannon',
    cost: 100,
    damage: 40,
    range: 90,
    fireRate: 0.8,
    color: '#ef4444',
    splash: 50,
    upgradeCost: 75,
    upgradeDamageBonus: 20,
    upgradeRangeBonus: 15,
  },
  ice: {
    type: 'ice',
    cost: 75,
    damage: 5,
    range: 110,
    fireRate: 1.5,
    color: '#3b82f6',
    slow: 0.5,
    slowDuration: 2,
    upgradeCost: 55,
    upgradeDamageBonus: 5,
    upgradeRangeBonus: 20,
  },
};

export function getTowerDef(type: TowerType): TowerDef {
  return TOWER_DEFS[type];
}
