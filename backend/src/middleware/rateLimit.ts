import { Hono } from 'hono';
import type { Env } from '../types';
import { RateLimitError } from '../utils/errors';

export function setupRateLimit(app: Hono<{ Bindings: Env }>) {
  app.use('/api/*', async (c, next) => {
    if (!c.env.RATE_LIMIT_KV) {
      return next();
    }
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const path = new URL(c.req.url).pathname;
    const isLogin = path.includes('/auth/login') || path.includes('/auth/register');
    const limit = isLogin ? 10 : 60;
    const windowSeconds = 60;
    const key = `rate_limit:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

    let count = 0;
    try {
      const stored = await c.env.RATE_LIMIT_KV.get(key);
      count = stored ? parseInt(stored, 10) : 0;
    } catch { /* KV unavailable, skip rate limit */ }

    if (count >= limit) {
      throw new RateLimitError(windowSeconds);
    }

    await next();

    try {
      await c.env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: windowSeconds });
    } catch { /* KV unavailable */ }
  });
}