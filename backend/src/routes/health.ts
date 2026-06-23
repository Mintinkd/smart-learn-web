import { Hono } from 'hono';
import type { Env } from '../types';
import { success } from '../utils/response';

const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get('/', async (c) => {
  let dbStatus = 'ok';
  try {
    await c.env.DB.prepare('SELECT 1').first();
  } catch (e) { dbStatus = `error: ${e instanceof Error ? e.message : String(e)}`; }

  let kvStatus = 'not_configured';
  try {
    if (c.env.RATE_LIMIT_KV) {
      await c.env.RATE_LIMIT_KV.get('__health_check__');
      kvStatus = 'ok';
    }
  } catch { kvStatus = 'error'; }

  return c.json(success({
    status: 'ok',
    database: dbStatus,
    kv: kvStatus,
    jwt_configured: !!c.env.JWT_SECRET_KEY,
    encryption_configured: !!c.env.ENCRYPTION_KEY,
    timestamp: new Date().toISOString()
  }));
});

export { healthRoutes };
