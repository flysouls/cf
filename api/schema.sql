-- 关卡表
CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1,
  wave_count INTEGER DEFAULT 100,
  map_data TEXT DEFAULT '{}',
  wave_config TEXT DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id INTEGER NOT NULL,
  player_name TEXT DEFAULT '匿名',
  score INTEGER DEFAULT 0,
  wave_reached INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  lives INTEGER DEFAULT 0,
  towers_placed TEXT DEFAULT '[]',
  completed INTEGER DEFAULT 0,
  saved_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);
