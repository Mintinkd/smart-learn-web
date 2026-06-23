import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { verifyJWT } from '../utils/jwt';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/health', '/api/init-admin'];

export function setupAuth(app: Hono<{ Bindings: Env }>) {
  app.use('/api/*', async (c, next) => {
    if (!c.env.JWT_SECRET_KEY) {
      return c.json({ code: 500, message: 'JWT_SECRET_KEY 未配置，请运行 wrangler secret put JWT_SECRET_KEY', data: null }, 500);
    }
    const path = new URL(c.req.url).pathname;
    if (PUBLIC_PATHS.some(p => path === p)) {
      return next();
    }
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('缺少认证令牌');
    }
    const token = authHeader.substring(7);
    try {
      const payload = await verifyJWT(token, c.env.JWT_SECRET_KEY);
      if (payload.type !== 'access') {
        throw new UnauthorizedError('无效的令牌类型');
      }
      c.set('user', payload);
      return next();
    } catch {
      throw new UnauthorizedError('令牌无效或已过期');
    }
  });
}
