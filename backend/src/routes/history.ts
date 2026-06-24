import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { success, error, paginated } from '../utils/response';
import { QARecordDAO } from '../dao/qaRecordDAO';
import { SessionDAO } from '../dao/sessionDAO';
import { TagDAO } from '../dao/tagDAO';

const historyRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

historyRoutes.get('/sessions', async (c) => {
  const user = c.get('user') as JWTPayload;
  const page = parseInt(c.req.query('page') || '1');
  const size = parseInt(c.req.query('size') || '20');
  const keyword = c.req.query('keyword');

  const sessionDAO = new SessionDAO();
  const qaDAO = new QARecordDAO();

  let sessions = await sessionDAO.findByUser(c.env.DB, user.username);

  if (keyword) {
    const matchedRecords = await qaDAO.searchByKeyword(c.env.DB, user.username, keyword);
    const matchedSessionIds = [...new Set(matchedRecords.map(r => r.session_id))];
    sessions = sessions.filter(s => matchedSessionIds.includes(s.session_id));
  }

  const total = sessions.length;
  const offset = (page - 1) * size;
  const paged = sessions.slice(offset, offset + size);

  const result = await Promise.all(paged.map(async (s) => {
    const records = await qaDAO.findBySession(c.env.DB, s.session_id);
    return {
      session_id: s.session_id,
      title: s.title,
      created_at: s.created_at,
      updated_at: s.updated_at,
      message_count: records.length,
      first_question: records[0]?.question?.substring(0, 50) || '',
    };
  }));

  return c.json(paginated(result, total, page, size));
});

historyRoutes.get('/sessions/:session_id', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionId = c.req.param('session_id');
  const sessionDAO = new SessionDAO();
  const qaDAO = new QARecordDAO();

  const session = await sessionDAO.findById(c.env.DB, sessionId);
  if (!session || session.username !== user.username) return c.json(error(404, '会话不存在'), 404);

  const records = await qaDAO.findBySession(c.env.DB, sessionId);
  return c.json(success({ session, records }));
});

historyRoutes.delete('/sessions/:session_id', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionId = c.req.param('session_id');
  const sessionDAO = new SessionDAO();
  const session = await sessionDAO.findById(c.env.DB, sessionId);
  if (!session || session.username !== user.username) return c.json(error(403, '无权限'), 403);
  await sessionDAO.deleteById(c.env.DB, sessionId);
  return c.json(success(null));
});

historyRoutes.delete('/sessions', async (c) => {
  const user = c.get('user') as JWTPayload;
  const body = await c.req.json<{ session_ids: string[] }>();
  if (!body.session_ids?.length) return c.json(error(400, '请选择要删除的会话'), 400);
  const sessionDAO = new SessionDAO();
  for (const id of body.session_ids) {
    await sessionDAO.deleteById(c.env.DB, id);
  }
  return c.json(success(null));
});

historyRoutes.post('/sessions/:session_id/tags', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionId = c.req.param('session_id');
  const body = await c.req.json<{ tag: string }>();
  if (!body.tag) return c.json(error(400, '请输入标签名'), 400);
  const tagDAO = new TagDAO();
  const qaDAO = new QARecordDAO();
  let tagEntity = await tagDAO.findByName(c.env.DB, user.username, body.tag);
  if (!tagEntity) {
    tagEntity = { tag_id: crypto.randomUUID(), name: body.tag, username: user.username, created_at: new Date().toISOString() };
    await tagDAO.insert(c.env.DB, tagEntity);
  }
  const records = await qaDAO.findBySession(c.env.DB, sessionId);
  for (const r of records) {
    await tagDAO.addRecordTag(c.env.DB, r.record_id, tagEntity.tag_id);
  }
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
  const sessionDAO = new SessionDAO();
  const qaDAO = new QARecordDAO();
  const sessions = await sessionDAO.findByUser(c.env.DB, user.username);
  const exportData = [];
  for (const s of sessions) {
    const records = await qaDAO.findBySession(c.env.DB, s.session_id);
    exportData.push({
      session_id: s.session_id,
      title: s.title,
      created_at: s.created_at,
      messages: records.map(r => ({ question: r.question, answer: r.answer, created_at: r.created_at }))
    });
  }
  return c.json(success(exportData));
});

export { historyRoutes };
