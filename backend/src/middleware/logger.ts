import { Hono } from 'hono';
import type { Env } from '../types';

export function setupLogger(app: Hono<{ Bindings: Env }>) {
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);

    await next();

    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      duration,
      clientIp: c.req.header('cf-connecting-ip') || 'unknown',
      userAgent: c.req.header('user-agent') || 'unknown',
    };
    console.log(JSON.stringify(logEntry));
  });
}