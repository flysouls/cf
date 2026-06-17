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

export default app;
