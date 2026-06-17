# Cloudflare 塔防游戏

基于 Cloudflare Workers + D1 + React 的全栈塔防游戏项目。

## 技术栈

- **后端**: Cloudflare Workers + Hono + D1 (边缘 SQLite)
- **前端**: React 18 + Vite + TypeScript + React Router
- **游戏**: HTML5 Canvas 自定义引擎
- **部署**: Cloudflare Workers (单项目托管 API + 静态资源)

## 项目结构

```
cf/
├── api/                    # 后端 API
│   ├── src/
│   │   ├── index.ts        # Hono 入口 + SPA fallback
│   │   ├── db.ts           # 类型定义
│   │   └── routes/
│   │       └── levels.ts   # 关卡 CRUD + 游戏记录
│   ├── schema.sql          # D1 数据库结构
│   ├── wrangler.toml       # 本地开发配置
│   └── package.json
├── web/                    # 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ListPage.tsx    # 关卡列表（CRUD）
│   │   │   └── GamePage.tsx    # 游戏页面
│   │   ├── game/
│   │   │   ├── engine.ts       # 游戏引擎主循环
│   │   │   ├── renderer.ts     # Canvas 渲染器
│   │   │   ├── towers.ts       # 塔定义（箭塔/炮塔/冰塔）
│   │   │   ├── enemies.ts      # 敌人定义
│   │   │   ├── projectiles.ts  # 弹道与伤害
│   │   │   ├── map.ts          # 蛇形路径生成
│   │   │   ├── waves.ts        # 波次动态生成器
│   │   │   └── types.ts        # 类型定义
│   │   └── api/client.ts       # API 请求封装
│   ├── vite.config.ts
│   └── package.json
├── wrangler.toml           # 生产部署配置
└── package.json            # Monorepo workspaces
```

## 功能特性

### 关卡管理
- 关卡的增删改查
- 可配置波次数（1-1000，默认 100）
- 难度等级（1-5 星）
- 发布/草稿状态

### 塔防游戏
- **三种塔**: 箭塔、炮塔（溅射）、冰塔（减速）
- **三种敌人**: 普通兵、快速兵、重甲兵
- **波次系统**: 动态生成，难度渐进
- **粒子特效**: 爆炸、命中火花、烟雾
- **速度控制**: 1x / 2x / 3x 变速
- **塔升级/出售**: 点击已放置的塔进行操作

### 进度保存
- 游戏状态实时保存到 D1 数据库
- 支持加载上次存档继续游戏
- 恢复：金币、生命、分数、已放置的塔（含等级）

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev -w web

# 启动后端（另一个终端）
npm run dev -w api
```

- 前端: http://localhost:5173
- API: http://localhost:8787

## 部署

```bash
# 构建前端
npm run build -w web

# 部署到 Cloudflare Workers
npx wrangler deploy
```

访问 Workers 域名即可使用（API + 前端一体化托管）。

## 数据库

使用 Cloudflare D1，表结构见 `api/schema.sql`：

| 表 | 用途 |
|---|---|
| `levels` | 关卡配置（名称、描述、波次数、难度等） |
| `game_records` | 游戏存档（分数、波次、塔布局等） |
