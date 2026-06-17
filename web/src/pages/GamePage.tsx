import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/engine';
import { GameState, TowerType, CANVAS_WIDTH, CANVAS_HEIGHT, Tower } from '../game/types';
import { TOWER_DEFS } from '../game/towers';
import { getLevel, saveGameRecord } from '../api/client';

const TOWER_LABELS: Record<TowerType, string> = {
  arrow: '箭塔',
  cannon: '炮塔',
  ice: '冰塔',
};

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [levelName, setLevelName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!canvasRef.current || !id) return;

    let cancelled = false;

    (async () => {
      // 加载关卡数据
      const res = await getLevel(parseInt(id));
      if (cancelled) return;
      if (!res.data) {
        alert('关卡不存在');
        navigate('/');
        return;
      }
      setLevelName(res.data.name);

      let waveConfig;
      try {
        waveConfig = typeof res.data.wave_config === 'string'
          ? JSON.parse(res.data.wave_config)
          : res.data.wave_config;
      } catch {
        waveConfig = undefined;
      }

      // 初始化引擎
      const engine = new GameEngine(canvasRef.current!, waveConfig);
      engine.onStateChange = (state) => setGameState({ ...state });
      engineRef.current = engine;
      setGameState({ ...engine.state });
    })();

    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [id, navigate]);

  const handleStart = () => engineRef.current?.start();
  const handlePause = () => engineRef.current?.togglePause();
  const handleSelectTower = (type: TowerType | null) => {
    engineRef.current?.selectTowerType(type);
  };

  const handleSave = async () => {
    if (!engineRef.current || !id) return;
    setSaving(true);
    try {
      // 直接从引擎读取最新状态，避免 React state 闭包陈旧问题
      const snapshot = engineRef.current.getSnapshot();
      await saveGameRecord(parseInt(id), {
        player_name: playerName || '匿名',
        score: snapshot.score,
        wave_reached: snapshot.currentWave,
        towers_placed: snapshot.towers,
        gold: snapshot.gold,
        lives: snapshot.lives,
        completed: snapshot.status === 'won',
      });
      setSaveMsg('保存成功!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      console.error('保存失败:', e);
      setSaveMsg('保存失败');
    }
    setSaving(false);
  };

  const handleUpgrade = () => {
    const tower = gameState?.selectedPlacedTower;
    if (!tower) return;
    engineRef.current?.upgradeTower(tower);
  };

  const handleSell = () => {
    const tower = gameState?.selectedPlacedTower;
    if (!tower) return;
    engineRef.current?.sellTower(tower);
  };

  const selectedTower = gameState?.selectedPlacedTower;

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      {/* 游戏区 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => navigate('/')} style={panelBtn}>返回列表</button>
          <h2 style={{ margin: 0, fontSize: 18 }}>{levelName}</h2>
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ border: '2px solid #334155', borderRadius: 8, background: '#1a1a2e', display: 'block', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        />
        {/* 控制按钮 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {gameState?.status === 'idle' && (
            <button onClick={handleStart} style={actionBtn('#22c55e')}>开始游戏</button>
          )}
          {(gameState?.status === 'playing' || gameState?.status === 'paused' || gameState?.status === 'won' || gameState?.status === 'lost') && (
            <>
              <button onClick={handlePause} disabled={gameState?.status === 'won' || gameState?.status === 'lost'} style={actionBtn('#f59e0b')}>
                {gameState?.status === 'paused' ? '继续' : '暂停'}
              </button>
              <button onClick={handleSave} disabled={saving} style={actionBtn('#3b82f6')}>
                {saving ? '保存中...' : '保存进度'}
              </button>
              {saveMsg && <span style={{ color: '#22c55e', lineHeight: '36px', fontSize: 14 }}>{saveMsg}</span>}
            </>
          )}
        </div>
        {/* 玩家名输入 */}
        <div style={{ marginTop: 8 }}>
          <input
            placeholder="输入玩家名（保存用）"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, width: 200 }}
          />
        </div>
      </div>

      {/* 侧边栏 */}
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 状态面板 */}
        {gameState && (
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>状态</h3>
            <div style={statRow}><span>金币</span><span style={{ color: '#fbbf24' }}>{gameState.gold}</span></div>
            <div style={statRow}><span>生命</span><span style={{ color: '#f87171' }}>{gameState.lives}/{gameState.maxLives}</span></div>
            <div style={statRow}><span>波次</span><span style={{ color: '#a5b4fc' }}>{gameState.currentWave}/{gameState.totalWaves}</span></div>
            <div style={statRow}><span>得分</span><span>{gameState.score}</span></div>
          </div>
        )}

        {/* 塔选择 */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>建造塔</h3>
          {(['arrow', 'cannon', 'ice'] as TowerType[]).map(type => {
            const def = TOWER_DEFS[type];
            const isSelected = gameState?.selectedTower === type;
            const canAfford = (gameState?.gold || 0) >= def.cost;
            return (
              <button
                key={type}
                onClick={() => handleSelectTower(isSelected ? null : type)}
                disabled={!canAfford}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', marginBottom: 4, border: isSelected ? `2px solid ${def.color}` : '1px solid #e2e8f0',
                  borderRadius: 6, background: isSelected ? `${def.color}22` : canAfford ? '#fff' : '#f1f5f9',
                  cursor: canAfford ? 'pointer' : 'not-allowed', fontSize: 13,
                }}
              >
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{TOWER_LABELS[type]}</span>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{def.cost}</span>
              </button>
            );
          })}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            选中塔后点击地图空地放置
          </div>
        </div>

        {/* 选中塔信息 */}
        {selectedTower && (
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
              {TOWER_LABELS[selectedTower.def.type]} Lv.{selectedTower.level}
            </h3>
            <div style={statRow}><span>伤害</span><span>{selectedTower.damage}</span></div>
            <div style={statRow}><span>射程</span><span>{selectedTower.range}</span></div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={handleUpgrade} style={actionBtn('#22c55e', true)}>
                升级 ({TOWER_DEFS[selectedTower.def.type].upgradeCost * selectedTower.level} 金)
              </button>
              <button onClick={handleSell} style={actionBtn('#ef4444', true)}>
                出售 (+{Math.floor(selectedTower.def.cost * 0.6)} 金)
              </button>
            </div>
          </div>
        )}

        {/* 操作说明 */}
        <div style={{ ...panelStyle, fontSize: 12, color: '#64748b' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155' }}>操作说明</h3>
          <p style={{ margin: '4px 0' }}>1. 选择塔类型，点击地图空地放置</p>
          <p style={{ margin: '4px 0' }}>2. 点击已有塔可升级/出售</p>
          <p style={{ margin: '4px 0' }}>3. 消灭所有波次敌人获胜</p>
          <p style={{ margin: '4px 0' }}>4. 10个敌人到达终点则失败</p>
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#fff', padding: 12, borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
};

const statRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13,
};

const panelBtn: React.CSSProperties = {
  padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};

const actionBtn = (color: string, small = false): React.CSSProperties => ({
  padding: small ? '4px 10px' : '8px 16px',
  background: color, color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: small ? 12 : 14, fontWeight: 600,
});
