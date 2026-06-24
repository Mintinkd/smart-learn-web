import { Hono } from 'hono';
import type { Env, JWTPayload } from './types';
import { AppError } from './utils/errors';
import { error } from './utils/response';
import { setupCORS } from './middleware/cors';
import { setupAuth } from './middleware/auth';
import { setupRateLimit } from './middleware/rateLimit';
import { setupLogger } from './middleware/logger';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { historyRoutes } from './routes/history';
import { knowledgeRoutes } from './routes/knowledge';
import { userRoutes } from './routes/user';
import { healthRoutes } from './routes/health';
import { hashPassword } from './utils/cryptoAdapter';

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; requestId: string } }>();

setupCORS(app);
setupLogger(app);
setupRateLimit(app);
setupAuth(app);

app.route('/api/auth', authRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/history', historyRoutes);
app.route('/api/admin/knowledge', knowledgeRoutes);
app.route('/api/user', userRoutes);
app.route('/health', healthRoutes);

app.get('/api/init-admin', async (c) => {
  try {
    const adminPassword = c.env.ADMIN_INITIAL_PASSWORD;
    if (!adminPassword) return c.json(error(400, '请先设置 ADMIN_INITIAL_PASSWORD Secret'), 400);
    const existing = await c.env.DB.prepare('SELECT username FROM users WHERE username = ?').bind('admin').first();
    if (existing) return c.json(error(400, '管理员账户已存在'), 400);
    const { hash, salt } = await hashPassword(adminPassword);
    const now = new Date().toISOString();
    await c.env.DB.prepare('INSERT INTO users (username, password_hash, salt, role, registered_at, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind('admin', hash, salt, '管理员', now, '正常').run();
    return c.json({ code: 0, message: '管理员账户创建成功', data: null });
  } catch (e) {
    console.error('init-admin error:', e instanceof Error ? e.message : String(e));
    return c.json(error(500, `初始化失败: ${e instanceof Error ? e.message : String(e)}`), 500);
  }
});

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(error(err.statusCode, `${err.code}: ${err.message}`), err.statusCode as 400);
  }
  console.error('Unhandled error:', err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) console.error(err.stack);
  return c.json(error(500, `SYS_001: ${err instanceof Error ? err.message : '服务器内部错误'}`), 500);
});

app.get('*', async (c) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api') || path === '/health') {
    return c.json(error(404, 'SYS_004: 接口不存在'), 404);
  }
  const res = await c.env.ASSETS.fetch(c.req.raw);
  return res;
});

export default app;
