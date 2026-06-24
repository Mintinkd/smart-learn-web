import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { success, error } from '../utils/response';
import { UserDAO } from '../dao/userDAO';
import { APIConfigDAO } from '../dao/apiConfigDAO';
import { verifyPassword, hashPassword, encryptApiKey } from '../utils/cryptoAdapter';

const userRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

userRoutes.get('/profile', async (c) => {
  const user = c.get('user') as JWTPayload;
  const userDAO = new UserDAO();
  const info = await userDAO.getUserInfo(c.env.DB, user.username);
  return c.json(success(info));
});

userRoutes.put('/password', async (c) => {
  const user = c.get('user') as JWTPayload;
  const body = await c.req.json<{ old_password: string; new_password: string }>();
  if (!body.old_password || !body.new_password) return c.json(error(400, '请输入原密码和新密码'), 400);

  const userDAO = new UserDAO();
  const existing = await userDAO.findByUsername(c.env.DB, user.username);
  if (!existing) return c.json(error(401, '用户不存在'), 401);

  const valid = await verifyPassword(body.old_password, existing.password_hash, existing.salt);
  if (!valid) return c.json(error(400, 'AUTH_005: 原密码错误'), 400);

  if (body.new_password.length < 6 || !/[a-zA-Z]/.test(body.new_password) || !/\d/.test(body.new_password)) {
    return c.json(error(400, 'AUTH_002: 密码必须包含字母和数字，且不少于6个字符'), 400);
  }

  const { hash, salt } = await hashPassword(body.new_password);
  await userDAO.updatePassword(c.env.DB, user.username, hash, salt);
  return c.json(success(null, '密码修改成功'));
});

userRoutes.get('/api-config', async (c) => {
  const apiConfigDAO = new APIConfigDAO();
  const config = c.env.ENCRYPTION_KEY ? await apiConfigDAO.load(c.env.DB, c.env.ENCRYPTION_KEY) : null;
  return c.json(success({
    provider: config?.provider || '智谱AI',
    model: config?.model || '',
    secret_key: config?.secret_key_encrypted || '',
    base_url: config?.base_url || '',
    is_verified: config?.is_verified || 0,
    last_verified: config?.last_verified || null
  }));
});

userRoutes.put('/api-config', async (c) => {
  if (!c.env.ENCRYPTION_KEY) return c.json(error(500, 'ENCRYPTION_KEY 未配置，请运行 wrangler secret put ENCRYPTION_KEY'), 500);
  const body = await c.req.json<{ provider: string; model: string; api_key: string; secret_key?: string; base_url?: string }>();
  if (!body.api_key) return c.json(error(400, '请输入API密钥'), 400);
  const apiConfigDAO = new APIConfigDAO();
  try {
    await apiConfigDAO.save(c.env.DB, {
      provider: body.provider || '智谱AI',
      model: body.model || '',
      api_key_encrypted: body.api_key,
      api_key_iv: '',
      secret_key_encrypted: body.secret_key || '',
      secret_key_iv: '',
      base_url: body.base_url || '',
      is_verified: 0
    }, c.env.ENCRYPTION_KEY);
  } catch (e) {
    console.error('save api config error:', e instanceof Error ? e.message : String(e));
    return c.json(error(500, `保存失败: ${e instanceof Error ? e.message : '加密错误'}`), 500);
  }
  return c.json(success(null, 'API配置已保存'));
});

export { userRoutes };