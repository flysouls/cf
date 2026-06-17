import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './db';
import levelsRouter from './routes/levels';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => c.env.CORS_ORIGIN || 'http://localhost:5173',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type'],
}));

app.get('/', (c) => c.json({ status: 'ok', message: 'Tower Defense API' }));
app.route('/api/levels', levelsRouter);

// SPA fallback: 非 API 路由全部返回 index.html
app.get('*', async (c) => {
  try {
    const url = new URL(c.req.url);
    const assetRes = await c.env.ASSETS.fetch(new Request(`https://assets${url.pathname}`, c.req.raw));
    if (assetRes.ok) return assetRes;
  } catch {}
  // 回退到 index.html
  const indexRes = await c.env.ASSETS.fetch(new Request('https://assets/index.html', c.req.raw));
  return new Response(indexRes.body, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});

export default app;
