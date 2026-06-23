import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { success, error } from '../utils/response';
import { UserDAO } from '../dao/userDAO';
import { hashPassword, verifyPassword } from '../utils/cryptoAdapter';
import { signJWT, verifyJWT } from '../utils/jwt';

const RESERVED_USERNAMES = new Set(['admin', 'system', 'root', 'administrator']);

function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return '用户名须为3-20个字符，仅允许字母数字下划线';
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return '该用户名不可使用';
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return '密码不少于6个字符';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return '密码必须包含字母和数字';
  return null;
}

const authRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

authRoutes.post('/register', async (c) => {
  if (!c.env.JWT_SECRET_KEY) return c.json(error(500, 'JWT_SECRET_KEY 未配置'), 500);
  const body = await c.req.json<{ username: string; password: string }>();
  const usernameErr = validateUsername(body.username);
  if (usernameErr) return c.json(error(400, usernameErr), 400);
  const passwordErr = validatePassword(body.password);
  if (passwordErr) return c.json(error(400, passwordErr), 400);

  const userDAO = new UserDAO();
  const existing = await userDAO.findByUsername(c.env.DB, body.username);
  if (existing) return c.json(error(400, 'AUTH_001: 用户名已存在'), 400);

  const { hash, salt } = await hashPassword(body.password);
  await userDAO.insert(c.env.DB, {
    username: body.username, password_hash: hash, salt,
    role: '普通用户', registered_at: new Date().toISOString(), status: '正常'
  });

  const accessToken = await signJWT({ username: body.username, role: '普通用户', type: 'access' }, c.env.JWT_SECRET_KEY, 7200);
  const refreshToken = await signJWT({ username: body.username, role: '普通用户', type: 'refresh' }, c.env.JWT_SECRET_KEY, 604800);
  return c.json(success({ access_token: accessToken, refresh_token: refreshToken, username: body.username, role: '普通用户' }));
});

authRoutes.post('/login', async (c) => {
  if (!c.env.JWT_SECRET_KEY) return c.json(error(500, 'JWT_SECRET_KEY 未配置'), 500);
  const body = await c.req.json<{ username: string; password: string }>();
  if (!body.username || !body.password) return c.json(error(400, '请输入用户名和密码'), 400);

  const userDAO = new UserDAO();
  const user = await userDAO.findByUsername(c.env.DB, body.username);
  if (!user) return c.json(error(401, 'AUTH_003: 用户名或密码错误'), 401);

  if (user.status === '锁定') {
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return c.json(error(403, 'AUTH_004: 账户已锁定，请15分钟后重试'), 403);
    }
    await userDAO.updateStatus(c.env.DB, body.username, '正常', null);
  }

  const valid = await verifyPassword(body.password, user.password_hash, user.salt);
  if (!valid) {
    const failCount = await userDAO.getFailedAttempts(c.env.DB, body.username);
    const newCount = failCount + 1;
    if (newCount >= 3) {
      await userDAO.updateStatus(c.env.DB, body.username, '锁定', new Date(Date.now() + 15 * 60 * 1000).toISOString());
    } else {
      await userDAO.updateFailedAttempts(c.env.DB, body.username, newCount);
    }
    return c.json(error(401, 'AUTH_003: 用户名或密码错误'), 401);
  }

  await userDAO.updateStatus(c.env.DB, body.username, '正常', null);

  await userDAO.updateLoginTime(c.env.DB, body.username);

  const accessToken = await signJWT({ username: user.username, role: user.role, type: 'access' }, c.env.JWT_SECRET_KEY, 7200);
  const refreshToken = await signJWT({ username: user.username, role: user.role, type: 'refresh' }, c.env.JWT_SECRET_KEY, 604800);
  return c.json(success({ access_token: accessToken, refresh_token: refreshToken, username: user.username, role: user.role }));
});

authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json<{ refresh_token: string }>();
  if (!body.refresh_token) return c.json(error(400, '缺少refresh_token'), 400);
  try {
    const payload = await verifyJWT(body.refresh_token, c.env.JWT_SECRET_KEY);
    if (payload.type !== 'refresh') return c.json(error(401, '无效的令牌类型'), 401);
    const accessToken = await signJWT({ username: payload.username, role: payload.role, type: 'access' }, c.env.JWT_SECRET_KEY, 7200);
    const refreshToken = await signJWT({ username: payload.username, role: payload.role, type: 'refresh' }, c.env.JWT_SECRET_KEY, 604800);
    return c.json(success({ access_token: accessToken, refresh_token: refreshToken }));
  } catch {
    return c.json(error(401, '令牌无效或已过期'), 401);
  }
});

export { authRoutes };
