import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { success, error } from '../utils/response';
import { KnowledgeDAO } from '../dao/knowledgeDAO';
import { ForbiddenError } from '../utils/errors';

const knowledgeRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

knowledgeRoutes.get('/', async (c) => {
  const user = c.get('user') as JWTPayload;
  if (user.role !== '管理员') return c.json(error(403, 'AUTH_006: 权限不足'), 403);
  const keyword = c.req.query('keyword');
  const category = c.req.query('category');
  const dao = new KnowledgeDAO();
  const entries = await dao.findAll(c.env.DB, keyword, category);
  return c.json(success(entries));
});

knowledgeRoutes.post('/', async (c) => {
  const user = c.get('user') as JWTPayload;
  if (user.role !== '管理员') return c.json(error(403, 'AUTH_006: 权限不足'), 403);
  const body = await c.req.json<{ title: string; content: string; category: string; tags: string }>();
  if (!body.title || !body.content || !body.category) return c.json(error(400, '标题、内容和分类为必填项'), 400);
  const dao = new KnowledgeDAO();
  try {
    const entryId = crypto.randomUUID();
    await dao.insert(c.env.DB, {
      entry_id: entryId, title: body.title, content: body.content, category: body.category,
      tags: body.tags || '', is_builtin: 0, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), created_by: user.username
    });
    return c.json(success({ entry_id: entryId }));
  } catch (e) {
    if (String(e).includes('UNIQUE')) return c.json(error(400, 'KNOW_001: 标题已存在'), 400);
    throw e;
  }
});

knowledgeRoutes.put('/:entry_id', async (c) => {
  const user = c.get('user') as JWTPayload;
  if (user.role !== '管理员') return c.json(error(403, 'AUTH_006: 权限不足'), 403);
  const entryId = c.req.param('entry_id');
  const body = await c.req.json<{ title?: string; content?: string; category?: string; tags?: string }>();
  const dao = new KnowledgeDAO();
  await dao.update(c.env.DB, entryId, body);
  return c.json(success(null));
});

knowledgeRoutes.delete('/:entry_id', async (c) => {
  const user = c.get('user') as JWTPayload;
  if (user.role !== '管理员') return c.json(error(403, 'AUTH_006: 权限不足'), 403);
  const entryId = c.req.param('entry_id');
  const dao = new KnowledgeDAO();
  const entry = await dao.findById(c.env.DB, entryId);
  if (!entry) return c.json(error(404, '条目不存在'), 404);
  if (entry.is_builtin) return c.json(error(400, 'KNOW_002: 系统内置条目不可删除'), 400);
  await dao.deleteById(c.env.DB, entryId);
  return c.json(success(null));
});

export { knowledgeRoutes };