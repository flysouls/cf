import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameEngine } from '../game/engine';
import { GameState, TowerType, CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/types';
import { TOWER_DEFS } from '../game/towers';
import { generateWaves } from '../game/waves';
import { getLevel, saveGameRecord, getGameRecords } from '../api/client';

const TOWER_LABELS: Record<TowerType, string> = { arrow: '箭塔', cannon: '炮塔', ice: '冰塔' };
const SPEEDS = [1, 2, 3];

interface SavedRecord {
  player_name: string; score: number; wave_reached: number;
  gold: number; lives: number; towers_placed: any[];
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gs, setGs] = useState<GameState | null>(null);
  const [levelName, setLevelName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [savedRecord, setSavedRecord] = useState<SavedRecord | null>(null);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !id) return;
    let cancelled = false;
    (async () => {
      const res = await getLevel(parseInt(id));
      if (cancelled) return;
      if (!res.data) { alert('关卡不存在'); navigate('/'); return; }
      setLevelName(res.data.name);
      const waveCount = res.data.wave_count || 100;
      const waveConfig = generateWaves(waveCount);

      const engine = new GameEngine(canvasRef.current!, waveConfig);
      engine.onStateChange = (state) => setGs({ ...state });
      engineRef.current = engine;
      setGs({ ...engine.state });

      // 加载最近的存档
      try {
        const rec = await getGameRecords(parseInt(id), 1);
        if (rec.data && rec.data.length > 0) {
          const latest = rec.data[0];
          const towers = typeof latest.towers_placed === 'string'
            ? JSON.parse(latest.towers_placed) : latest.towers_placed;
          setSavedRecord({
            player_name: latest.player_name, score: latest.score,
            wave_reached: latest.wave_reached, gold: latest.gold,
            lives: latest.lives, towers_placed: towers,
          });
        }
      } catch {}
    })();
    return () => { cancelled = true; engineRef.current?.destroy(); engineRef.current = null; };
  }, [id, navigate]);

  const handleStart = () => engineRef.current?.start();
  const handlePause = () => engineRef.current?.togglePause();
  const handleSelectTower = (type: TowerType | null) => engineRef.current?.selectTowerType(type);
  const handleSpeed = (s: number) => engineRef.current?.setSpeed(s);

  const handleResume = () => {
    if (!engineRef.current || !savedRecord) return;
    engineRef.current.restoreState({
      gold: savedRecord.gold, lives: savedRecord.lives,
      score: savedRecord.score, wave_reached: savedRecord.wave_reached,
      towers_placed: savedRecord.towers_placed,
    });
    setResumed(true);
    setPlayerName(savedRecord.player_name || '');
    engineRef.current.start();
  };

  const handleSave = async () => {
    if (!engineRef.current || !id) return;
    setSaving(true);
    try {
      const snap = engineRef.current.getSnapshot();
      await saveGameRecord(parseInt(id), {
        player_name: playerName || '匿名', score: snap.score,
        wave_reached: snap.currentWave, towers_placed: snap.towers,
        gold: snap.gold, lives: snap.lives, completed: snap.status === 'won',
      });
      setSaveMsg('保存成功!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) { console.error('保存失败:', e); setSaveMsg('保存失败'); }
    setSaving(false);
  };

  const handleUpgrade = () => { const t = gs?.selectedPlacedTower; if (t) engineRef.current?.upgradeTower(t); };
  const handleSell = () => { const t = gs?.selectedPlacedTower; if (t) engineRef.current?.sellTower(t); };
  const selTower = gs?.selectedPlacedTower;
  const status = gs?.status;
  const isActive = status === 'playing' || status === 'paused' || status === 'won' || status === 'lost';

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => navigate('/')} style={panelBtn}>返回列表</button>
          <h2 style={{ margin: 0, fontSize: 18 }}>{levelName}</h2>
        </div>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
          style={{ border: '2px solid #334155', borderRadius: 8, background: '#1a1a2e', display: 'block' }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {status === 'idle' && (
            <>
              <button onClick={handleStart} style={actionBtn('#22c55e')}>新游戏</button>
              {savedRecord && !resumed && (
                <button onClick={handleResume} style={actionBtn('#8b5cf6')}>
                  继续存档 (波{savedRecord.wave_reached} / {savedRecord.score}分)
                </button>
              )}
            </>
          )}
          {isActive && (
            <>
              <button onClick={handlePause} disabled={status === 'won' || status === 'lost'} style={actionBtn('#f59e0b')}>
                {status === 'paused' ? '继续' : '暂停'}
              </button>
              <button onClick={handleSave} disabled={saving} style={actionBtn('#3b82f6')}>
                {saving ? '保存中...' : '保存进度'}
              </button>
              {/* 速度控制 */}
              {SPEEDS.map(s => (
                <button key={s} onClick={() => handleSpeed(s)}
                  style={actionBtn(gs?.speedMultiplier === s ? '#ef4444' : '#6b7280')}>
                  {s}x
                </button>
              ))}
              {saveMsg && <span style={{ color: '#22c55e', fontSize: 14 }}>{saveMsg}</span>}
            </>
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          <input placeholder="输入玩家名（保存用）" value={playerName} onChange={e => setPlayerName(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, width: 200 }} />
        </div>
      </div>

      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {gs && (
          <div style={panel}>
            <h3 style={panelH3}>状态</h3>
            <Row k="金币" v={gs.gold} c="#fbbf24" />
            <Row k="生命" v={`${gs.lives}/${gs.maxLives}`} c="#f87171" />
            <Row k="波次" v={`${gs.currentWave}/${gs.totalWaves}`} c="#a5b4fc" />
            <Row k="得分" v={gs.score} />
            {gs.speedMultiplier !== 1 && <Row k="速度" v={`${gs.speedMultiplier}x`} c="#fbbf24" />}
          </div>
        )}

        <div style={panel}>
          <h3 style={panelH3}>建造塔</h3>
          {(['arrow', 'cannon', 'ice'] as TowerType[]).map(type => {
            const def = TOWER_DEFS[type];
            const isSel = gs?.selectedTower === type;
            const can = (gs?.gold || 0) >= def.cost;
            return (
              <button key={type} onClick={() => handleSelectTower(isSel ? null : type)} disabled={!can}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', marginBottom: 4,
                  border: isSel ? `2px solid ${def.color}` : '1px solid #e2e8f0', borderRadius: 6,
                  background: isSel ? `${def.color}22` : can ? '#fff' : '#f1f5f9',
                  cursor: can ? 'pointer' : 'not-allowed', fontSize: 13 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{TOWER_LABELS[type]}</span>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{def.cost}</span>
              </button>
            );
          })}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>选中塔后点击空地放置</div>
        </div>

        {selTower && (
          <div style={panel}>
            <h3 style={panelH3}>{TOWER_LABELS[selTower.def.type]} Lv.{selTower.level}</h3>
            <Row k="伤害" v={selTower.damage} />
            <Row k="射程" v={selTower.range} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={handleUpgrade} style={actionBtn('#22c55e', true)}>
                升级 ({TOWER_DEFS[selTower.def.type].upgradeCost * selTower.level} 金)
              </button>
              <button onClick={handleSell} style={actionBtn('#ef4444', true)}>
                出售 (+{Math.floor(selTower.def.cost * 0.6)} 金)
              </button>
            </div>
          </div>
        )}

        <div style={{ ...panel, fontSize: 12, color: '#64748b' }}>
          <h3 style={{ ...panelH3, color: '#334155' }}>操作说明</h3>
          <p style={pStyle}>1. 选择塔类型，点击空地放置</p>
          <p style={pStyle}>2. 点击已有塔可升级/出售</p>
          <p style={pStyle}>3. 消灭所有波次敌人获胜</p>
          <p style={pStyle}>4. 10个敌人到达终点则失败</p>
          <p style={pStyle}>5. 支持 1x/2x/3x 变速</p>
        </div>
      </div>
    </div>
  );
}

const Row = ({ k, v, c }: { k: string; v: any; c?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 13 }}>
    <span>{k}</span><span style={{ color: c }}>{v}</span>
  </div>
);
const panel: React.CSSProperties = {
  background: '#fff', padding: 12, borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
};
const panelH3: React.CSSProperties = { margin: '0 0 8px', fontSize: 14 };
const pStyle: React.CSSProperties = { margin: '4px 0' };
const panelBtn: React.CSSProperties = {
  padding: '6px 12px', background: '#64748b', color: '#fff', border: 'none',
  borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
const actionBtn = (color: string, small = false): React.CSSProperties => ({
  padding: small ? '4px 10px' : '8px 16px', background: color, color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: small ? 12 : 14, fontWeight: 600,
});
