import { Hono } from 'hono';
import { Env } from '../db';

const levelsRouter = new Hono<{ Bindings: Env }>();

// 列表（分页 + 搜索）
levelsRouter.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');
  const search = c.req.query('search') || '';
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const params: any[] = [];
  if (search) {
    whereClause = 'WHERE name LIKE ? OR description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM levels ${whereClause}`
  ).bind(...params).first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await c.env.DB.prepare(
    `SELECT id, name, description, difficulty, status, created_at, updated_at
     FROM levels ${whereClause}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, pageSize, offset).all();

  return c.json({
    data: results.results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// 详情
levelsRouter.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const level = await c.env.DB.prepare('SELECT * FROM levels WHERE id = ?')
    .bind(id).first();
  if (!level) return c.json({ error: '关卡不存在' }, 404);
  return c.json({ data: level });
});

// 新建
levelsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { name, description, difficulty, map_data, wave_config, status } = body;
  if (!name) return c.json({ error: '名称不能为空' }, 400);

  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    `INSERT INTO levels (name, description, difficulty, map_data, wave_config, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    name,
    description || '',
    difficulty || 1,
    JSON.stringify(map_data || {}),
    JSON.stringify(wave_config || {}),
    status || 'draft',
    now,
    now
  ).run();

  return c.json({ data: { id: result.meta.last_row_id }, message: '创建成功' }, 201);
});

// 更新
levelsRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { name, description, difficulty, map_data, wave_config, status } = body;

  const existing = await c.env.DB.prepare('SELECT * FROM levels WHERE id = ?')
    .bind(id).first();
  if (!existing) return c.json({ error: '关卡不存在' }, 404);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE levels SET name=?, description=?, difficulty=?, map_data=?, wave_config=?, status=?, updated_at=?
     WHERE id=?`
  ).bind(
    name ?? (existing as any).name,
    description ?? (existing as any).description,
    difficulty ?? (existing as any).difficulty,
    map_data ? JSON.stringify(map_data) : (existing as any).map_data,
    wave_config ? JSON.stringify(wave_config) : (existing as any).wave_config,
    status ?? (existing as any).status,
    now,
    id
  ).run();

  return c.json({ message: '更新成功' });
});

// 删除
levelsRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const existing = await c.env.DB.prepare('SELECT * FROM levels WHERE id = ?')
    .bind(id).first();
  if (!existing) return c.json({ error: '关卡不存在' }, 404);

  await c.env.DB.prepare('DELETE FROM game_records WHERE level_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM levels WHERE id = ?').bind(id).run();

  return c.json({ message: '删除成功' });
});

// 保存游戏记录
levelsRouter.post('/:id/save', async (c) => {
  const levelId = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { player_name, score, wave_reached, towers_placed, gold, lives, completed } = body;

  const level = await c.env.DB.prepare('SELECT * FROM levels WHERE id = ?')
    .bind(levelId).first();
  if (!level) return c.json({ error: '关卡不存在' }, 404);

  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    `INSERT INTO game_records (level_id, player_name, score, wave_reached, gold, lives, towers_placed, completed, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    levelId,
    player_name || '匿名',
    score || 0,
    wave_reached || 0,
    gold || 0,
    lives || 0,
    JSON.stringify(towers_placed || []),
    completed ? 1 : 0,
    now
  ).run();

  return c.json({ data: { id: result.meta.last_row_id }, message: '保存成功' }, 201);
});

// 获取关卡的游戏记录
levelsRouter.get('/:id/records', async (c) => {
  const levelId = parseInt(c.req.param('id'));
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');
  const offset = (page - 1) * pageSize;

  const results = await c.env.DB.prepare(
    `SELECT * FROM game_records WHERE level_id = ?
     ORDER BY score DESC LIMIT ? OFFSET ?`
  ).bind(levelId, pageSize, offset).all();

  return c.json({ data: results.results, page, pageSize });
});

export default levelsRouter;
