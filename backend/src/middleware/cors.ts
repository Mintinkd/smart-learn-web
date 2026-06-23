import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../types';

export function setupCORS(app: Hono<{ Bindings: Env }>) {
  app.use('*', async (c, next) => {
    const origins = c.env.CORS_ORIGINS || '*';
    const corsMiddleware = cors({
      origin: origins.split(',').map(o => o.trim()),
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
      credentials: true,
    });
    return corsMiddleware(c, next);
  });
}