# 智能学习助手 Web 版

人工智能问答/答疑系统，基于 Cloudflare Workers + Vue3 构建。

## 架构

```
┌─────────────────────┐     ┌──────────────────────┐
│   Cloudflare Pages  │────▶│  Cloudflare Workers   │
│   (Vue3 SPA 前端)    │     │  (Hono API 后端)      │
└─────────────────────┘     └───────┬──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │ D1 数据库 │   │ KV 频率限制│   │ LLM API  │
              └──────────┘   └──────────┘   └──────────┘
```

## 技术栈

- **后端**: TypeScript + Hono + Cloudflare Workers
- **前端**: Vue3 + Element Plus + Pinia + Vue Router
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV (频率限制)
- **加密**: Web Crypto API (PBKDF2-SHA256 + AES-256-GCM)
- **流式通信**: SSE (Server-Sent Events)
- **LLM**: 智谱AI GLM-4 / 百度UNIT

## 本地开发

### 前置条件

- Node.js >= 18
- npm >= 9

### 1. 后端

```bash
cd backend
npm install

# 创建本地 D1 数据库并执行迁移
npx wrangler d1 migrations apply smart-learn-db --local

# 设置本地 Secrets（开发环境写入 .dev.vars）
# JWT_SECRET_KEY=your-secret-key-at-least-32-chars
# ENCRYPTION_KEY=your-base64-encoded-32-byte-key
# ADMIN_INITIAL_PASSWORD=your-admin-password

# 启动开发服务器
npm run dev
```

后端运行在 `http://localhost:8787`

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，API 请求自动代理到后端。

## 部署

### 后端 (Cloudflare Workers)

```bash
cd backend

# 1. 创建 D1 数据库
npx wrangler d1 create smart-learn-db
# 将返回的 database_id 填入 wrangler.toml

# 2. 执行生产环境迁移
npx wrangler d1 migrations apply smart-learn-db

# 3. 创建 KV 命名空间
npx wrangler kv namespace create RATE_LIMIT_KV
# 将返回的 id 填入 wrangler.toml

# 4. 设置 Secrets
npx wrangler secret put JWT_SECRET_KEY
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put ADMIN_INITIAL_PASSWORD

# 5. 更新 wrangler.toml 中的 CORS_ORIGINS 为你的 Pages 域名

# 6. 部署
npm run deploy

# 7. 创建管理员账户
curl https://your-workers-url/api/init-admin
```

### 前端 (Cloudflare Pages)

1. 将代码推送到 Git 仓库
2. 在 Cloudflare Dashboard 创建 Pages 项目
3. 配置：
   - 构建命令: `cd frontend && npm install && npm run build`
   - 输出目录: `frontend/dist`
   - 环境变量: `VITE_API_BASE_URL=https://your-workers-url`
4. 更新后端 `wrangler.toml` 中的 `CORS_ORIGINS` 为 Pages 域名

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/refresh` | 刷新令牌 |

### 问答

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat/ask` | 提交问题（SSE 流式响应） |
| POST | `/api/chat/sessions` | 创建会话 |
| GET | `/api/chat/sessions` | 获取会话列表 |
| GET | `/api/chat/sessions/:id/history` | 获取会话历史 |
| DELETE | `/api/chat/sessions/:id` | 删除会话 |
| POST | `/api/chat/verify-api-key` | 验证 API 密钥 |

### 历史记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/history/records` | 分页查询记录 |
| GET | `/api/history/records/:id` | 获取记录详情 |
| DELETE | `/api/history/records` | 批量删除记录 |
| POST | `/api/history/records/:id/tags` | 添加标签 |
| DELETE | `/api/history/records/:id/tags/:tag_id` | 移除标签 |
| GET | `/api/history/tags` | 获取标签列表 |
| GET | `/api/history/export` | 导出历史数据 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取用户信息 |
| PUT | `/api/user/password` | 修改密码 |
| GET | `/api/user/api-config` | 获取 API 配置 |
| PUT | `/api/user/api-config` | 保存 API 配置 |

### 管理后台

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/knowledge` | 查询知识库 |
| POST | `/api/admin/knowledge` | 创建知识条目 |
| PUT | `/api/admin/knowledge/:id` | 更新知识条目 |
| DELETE | `/api/admin/knowledge/:id` | 删除知识条目 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/init-admin` | 初始化管理员账户 |

## 错误码

| 错误码 | 说明 |
|--------|------|
| AUTH_001 | 用户名已存在 |
| AUTH_002 | 密码强度不足 |
| AUTH_003 | 用户名或密码错误 |
| AUTH_004 | 账户已锁定 |
| AUTH_005 | 原密码错误 |
| AUTH_006 | 权限不足 |
| CHAT_001 | 问题内容为空 |
| CHAT_002 | 问题内容过长 |
| CHAT_005 | API 密钥未配置 |
| HIST_001 | 记录不存在 |
| KNOW_001 | 知识条目标题已存在 |
| KNOW_002 | 系统内置条目不可删除 |
| SYS_001 | 服务器内部错误 |
| SYS_004 | 接口不存在 |

## 环境变量

### 后端 Secrets（通过 `wrangler secret put` 设置）

| 变量名 | 说明 |
|--------|------|
| JWT_SECRET_KEY | JWT 签名密钥（至少 32 字符随机字符串） |
| ENCRYPTION_KEY | API 密钥加密密钥（32 字节 Base64 编码） |
| ADMIN_INITIAL_PASSWORD | 管理员初始密码 |

### 后端环境变量（wrangler.toml vars）

| 变量名 | 说明 |
|--------|------|
| CORS_ORIGINS | 允许的跨域域名（逗号分隔） |

### 前端环境变量

| 变量名 | 说明 |
|--------|------|
| VITE_API_BASE_URL | 后端 API 地址 |