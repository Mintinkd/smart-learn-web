import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { success, error, paginated } from '../utils/response';
import { QARecordDAO } from '../dao/qaRecordDAO';
import { TagDAO } from '../dao/tagDAO';

const historyRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

historyRoutes.get('/records', async (c) => {
  const user = c.get('user') as JWTPayload;
  const page = parseInt(c.req.query('page') || '1');
  const size = parseInt(c.req.query('size') || '20');
  const tag = c.req.query('tag');
  const keyword = c.req.query('keyword');

  const qaDAO = new QARecordDAO();
  const tagDAO = new TagDAO();

  if (keyword) {
    const records = await qaDAO.searchByKeyword(c.env.DB, user.username, keyword);
    return c.json(success(records));
  }

  if (tag) {
    const tagEntity = await tagDAO.findByName(c.env.DB, user.username, tag);
    if (!tagEntity) return c.json(success([]));
    const recordIds = await tagDAO.findRecordsByTag(c.env.DB, tagEntity.tag_id);
    const allResult = await qaDAO.findByUser(c.env.DB, user.username, 0, 10000);
    const filtered = allResult.items.filter(r => recordIds.includes(r.record_id));
    return c.json(success(filtered));
  }

  const offset = (page - 1) * size;
  const result = await qaDAO.findByUser(c.env.DB, user.username, offset, size);
  return c.json(paginated(result.items, result.total, page, size));
});

historyRoutes.get('/records/:record_id', async (c) => {
  const user = c.get('user') as JWTPayload;
  const recordId = c.req.param('record_id');
  const qaDAO = new QARecordDAO();
  const record = await qaDAO.findById(c.env.DB, recordId);
  if (!record || record.username !== user.username) return c.json(error(404, 'HIST_001: 记录不存在'), 404);
  const sessionRecords = await qaDAO.findBySession(c.env.DB, record.session_id);
  return c.json(success({ record, session_context: sessionRecords }));
});

historyRoutes.delete('/records', async (c) => {
  const user = c.get('user') as JWTPayload;
  const body = await c.req.json<{ record_ids: string[] }>();
  if (!body.record_ids?.length) return c.json(error(400, '请选择要删除的记录'), 400);
  const qaDAO = new QARecordDAO();
  await qaDAO.deleteByIds(c.env.DB, body.record_ids);
  return c.json(success(null));
});

historyRoutes.post('/records/:record_id/tags', async (c) => {
  const user = c.get('user') as JWTPayload;
  const recordId = c.req.param('record_id');
  const body = await c.req.json<{ tag: string }>();
  if (!body.tag) return c.json(error(400, '请输入标签名'), 400);
  const tagDAO = new TagDAO();
  let tagEntity = await tagDAO.findByName(c.env.DB, user.username, body.tag);
  if (!tagEntity) {
    tagEntity = { tag_id: crypto.randomUUID(), name: body.tag, username: user.username, created_at: new Date().toISOString() };
    await tagDAO.insert(c.env.DB, tagEntity);
  }
  await tagDAO.addRecordTag(c.env.DB, recordId, tagEntity.tag_id);
  return c.json(success(null));
});

historyRoutes.delete('/records/:record_id/tags/:tag_id', async (c) => {
  const recordId = c.req.param('record_id');
  const tagId = c.req.param('tag_id');
  const tagDAO = new TagDAO();
  await tagDAO.removeRecordTag(c.env.DB, recordId, tagId);
  return c.json(success(null));
});

historyRoutes.get('/tags', async (c) => {
  const user = c.get('user') as JWTPayload;
  const tagDAO = new TagDAO();
  const tags = await tagDAO.findByUser(c.env.DB, user.username);
  return c.json(success(tags));
});

historyRoutes.get('/export', async (c) => {
  const user = c.get('user') as JWTPayload;
  const qaDAO = new QARecordDAO();
  const result = await qaDAO.findByUser(c.env.DB, user.username, 0, 100000);
  const exportData = result.items.map(r => ({
    record_id: r.record_id, question: r.question, answer: r.answer,
    created_at: r.created_at, api_status: r.api_status, api_provider: r.api_provider
  }));
  return c.json(success(exportData));
});

export { historyRoutes };