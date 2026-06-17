import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLevels, createLevel, updateLevel, deleteLevel } from '../api/client';

interface Level {
  id: number;
  name: string;
  description: string;
  difficulty: number;
  wave_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ListPage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [form, setForm] = useState({ name: '', description: '', difficulty: 1, wave_count: 100, status: 'draft' });

  const fetchLevels = useCallback(async () => {
    const res = await getLevels({ page, pageSize: 10, search });
    setLevels(res.data || []);
    setTotal(res.total || 0);
    setTotalPages(res.totalPages || 1);
  }, [page, search]);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const openCreate = () => {
    setEditingLevel(null);
    setForm({ name: '', description: '', difficulty: 1, wave_count: 100, status: 'draft' });
    setShowModal(true);
  };

  const openEdit = (level: Level) => {
    setEditingLevel(level);
    setForm({
      name: level.name,
      description: level.description,
      difficulty: level.difficulty,
      wave_count: level.wave_count || 100,
      status: level.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('请输入关卡名称');
    const wc = Math.max(1, Math.min(1000, Math.floor(form.wave_count)));
    if (editingLevel) {
      await updateLevel(editingLevel.id, { ...form, wave_count: wc });
    } else {
      await createLevel({ ...form, wave_count: wc });
    }
    setShowModal(false);
    fetchLevels();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该关卡？')) return;
    await deleteLevel(id);
    fetchLevels();
  };

  const difficultyStars = (d: number) => '★'.repeat(d) + '☆'.repeat(5 - d);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>塔防关卡管理</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          placeholder="搜索关卡..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }}
        />
        <button onClick={openCreate} style={btnStyle('#4f46e5')}>+ 新建关卡</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['ID', '名称', '波次', '难度', '状态', '创建时间', '操作'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {levels.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>暂无数据，点击「新建关卡」创建第一个关卡</td></tr>
          )}
          {levels.map(level => (
            <tr key={level.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 12px', color: '#64748b' }}>#{level.id}</td>
              <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate(`/game/${level.id}`); }}
                  style={{ color: '#4f46e5', textDecoration: 'none' }}>{level.name}</a>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, background: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>
                  {level.wave_count || 100}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{difficultyStars(level.difficulty)}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, background: level.status === 'published' ? '#dcfce7' : '#fef3c7', color: level.status === 'published' ? '#16a34a' : '#d97706' }}>
                  {level.status === 'published' ? '已发布' : '草稿'}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 13 }}>{new Date(level.created_at).toLocaleDateString()}</td>
              <td style={{ padding: '10px 12px' }}>
                <button onClick={() => navigate(`/game/${level.id}`)} style={{ ...btnSmStyle, color: '#4f46e5' }}>游玩</button>
                <button onClick={() => openEdit(level)} style={{ ...btnSmStyle, color: '#0891b2' }}>编辑</button>
                <button onClick={() => handleDelete(level.id)} style={{ ...btnSmStyle, color: '#dc2626' }}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={btnStyle('#6b7280', page <= 1)}>上一页</button>
          <span style={{ lineHeight: '36px', color: '#64748b' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={btnStyle('#6b7280', page >= totalPages)}>下一页</button>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>{editingLevel ? '编辑关卡' : '新建关卡'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label>名称
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 6, marginTop: 4, boxSizing: 'border-box' }} />
              </label>
              <label>描述
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 6, marginTop: 4, boxSizing: 'border-box' }} />
              </label>
              <label>波次数 (1-1000)
                <input type="number" min={1} max={1000} value={form.wave_count}
                  onChange={e => setForm({ ...form, wave_count: parseInt(e.target.value) || 100 })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 6, marginTop: 4, boxSizing: 'border-box' }} />
              </label>
              <label>难度 (1-5)
                <input type="number" min={1} max={5} value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 6, marginTop: 4, boxSizing: 'border-box' }} />
              </label>
              <label>状态
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }}>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={btnStyle('#6b7280')}>取消</button>
              <button onClick={handleSubmit} style={btnStyle('#4f46e5')}>{editingLevel ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg: string, disabled = false): React.CSSProperties => ({
  padding: '8px 16px', background: disabled ? '#e2e8f0' : bg, color: '#fff', border: 'none',
  borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
});

const btnSmStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginRight: 8,
};
