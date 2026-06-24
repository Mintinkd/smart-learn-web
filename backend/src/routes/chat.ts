import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { success, error } from '../utils/response';
import { UserDAO } from '../dao/userDAO';
import { SessionDAO } from '../dao/sessionDAO';
import { QARecordDAO } from '../dao/qaRecordDAO';
import { KnowledgeDAO } from '../dao/knowledgeDAO';
import { APIConfigDAO } from '../dao/apiConfigDAO';
import { createLLMClient } from '../services/llmClient';

const chatRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

chatRoutes.post('/ask', async (c) => {
  const user = c.get('user') as JWTPayload;
  const body = await c.req.json<{ session_id: string; question: string }>();
  if (!body.question?.trim()) return c.json(error(400, 'CHAT_001: 请输入学习问题'), 400);
  if (body.question.length > 4000) return c.json(error(400, 'CHAT_002: 问题内容过长'), 400);
  if (!body.session_id) return c.json(error(400, '缺少session_id'), 400);
  if (!c.env.ENCRYPTION_KEY) return c.json(error(500, 'ENCRYPTION_KEY 未配置'), 500);

  const apiConfigDAO = new APIConfigDAO();
  let config;
  try {
    config = await apiConfigDAO.load(c.env.DB, c.env.ENCRYPTION_KEY);
  } catch (e) {
    console.error('load api config error:', e instanceof Error ? e.message : String(e));
    return c.json(error(500, 'API配置读取失败，请重新保存配置'), 500);
  }
  if (!config?.api_key_encrypted) return c.json(error(400, 'CHAT_005: 请先配置API密钥'), 400);

  const llm = createLLMClient(config.provider, config.api_key_encrypted);
  const qaDAO = new QARecordDAO();
  const sessionDAO = new SessionDAO();
  const knowledgeDAO = new KnowledgeDAO();

  const history = await qaDAO.findBySession(c.env.DB, body.session_id);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: '你是一个智能学习助手，请用中文回答学习问题。' }
  ];
  for (const record of history) {
    messages.push({ role: 'user', content: record.question });
    messages.push({ role: 'assistant', content: record.answer });
  }

  const keywords = body.question.replace(/[，。？、！；：""''（）\[\]{},.?!;:()]/g, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 5);
  if (keywords.length > 0) {
    const relevant = await knowledgeDAO.searchByKeywords(c.env.DB, keywords);
    if (relevant.length > 0) {
      const knowledgeText = relevant.slice(0, 3).map(e => `【${e.title}】${e.content}`).join('\n');
      messages[0].content += `\n\n参考知识：\n${knowledgeText}`;
    }
  }
  messages.push({ role: 'user', content: body.question });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullAnswer = '';
      let apiStatus: '成功' | '超时' | '失败' = '成功';
      try {
        for await (const token of llm.chatStream(messages)) {
          fullAnswer += token;
          controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`));
        }
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ record_id: crypto.randomUUID() })}\n\n`));
      } catch (e) {
        apiStatus = e instanceof Error && e.message.includes('abort') ? '超时' : '失败';
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error('LLM stream error:', errMsg);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: `请求失败: ${errMsg}` })}\n\n`));
        fullAnswer = fullAnswer || `[错误] 请求失败: ${errMsg}`;
      }
      controller.close();

      const recordId = crypto.randomUUID();
      await qaDAO.insert(c.env.DB, {
        record_id: recordId, username: user.username, session_id: body.session_id,
        question: body.question, answer: fullAnswer, created_at: new Date().toISOString(),
        api_status: apiStatus, api_provider: config.provider
      });

      const session = await sessionDAO.findById(c.env.DB, body.session_id);
      if (session?.title === '新会话') {
        await sessionDAO.updateTitle(c.env.DB, body.session_id, body.question.substring(0, 30));
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  });
});

chatRoutes.post('/sessions', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionDAO = new SessionDAO();
  const sessionId = crypto.randomUUID();
  await sessionDAO.insert(c.env.DB, {
    session_id: sessionId, username: user.username, title: '新会话',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: '进行中'
  });
  return c.json(success({ session_id: sessionId }));
});

chatRoutes.get('/sessions', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionDAO = new SessionDAO();
  const sessions = await sessionDAO.findByUser(c.env.DB, user.username);
  return c.json(success(sessions));
});

chatRoutes.get('/sessions/:session_id/history', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionId = c.req.param('session_id');
  const qaDAO = new QARecordDAO();
  const records = await qaDAO.findBySession(c.env.DB, sessionId);
  const filtered = records.filter(r => r.username === user.username);
  return c.json(success(filtered));
});

chatRoutes.delete('/sessions/:session_id', async (c) => {
  const user = c.get('user') as JWTPayload;
  const sessionId = c.req.param('session_id');
  const sessionDAO = new SessionDAO();
  const session = await sessionDAO.findById(c.env.DB, sessionId);
  if (!session || session.username !== user.username) return c.json(error(403, '无权限'), 403);
  await sessionDAO.deleteById(c.env.DB, sessionId);
  return c.json(success(null));
});

chatRoutes.post('/verify-api-key', async (c) => {
  const body = await c.req.json<{ provider: string; api_key: string }>();
  if (!body.api_key) return c.json(error(400, '请输入API密钥'), 400);
  const llm = createLLMClient(body.provider, body.api_key);
  const valid = await llm.verifyKey();
  return c.json(success({ valid }));
});

export { chatRoutes };