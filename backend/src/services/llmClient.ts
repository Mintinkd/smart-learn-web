export interface LLMClient {
  chatStream(messages: Array<{ role: string; content: string }>, timeout?: number): AsyncGenerator<string, void, unknown>;
  verifyKey(): Promise<boolean>;
  getProviderName(): string;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const parsed = JSON.parse(text);
    return parsed.error?.message || parsed.message || parsed.msg || text;
  } catch { return `HTTP ${response.status}`; }
}

async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error));
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('{')) throw e;
      }
    }
  }
}

export class ZhipuLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private readonly url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  constructor(apiKey: string, model?: string) { this.apiKey = apiKey; this.model = model || 'glm-4-flash'; }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 60000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.7, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`智谱AI: ${await readErrorBody(response)}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('智谱AI: 无响应体');
      yield* parseSSEStream(reader);
    } finally { clearTimeout(timer); }
  }

  async verifyKey(): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: 'hi' }], temperature: 0.7 }),
      });
      return response.status !== 401 && response.status !== 403;
    } catch { return false; }
  }

  getProviderName(): string { return '智谱AI'; }
}

export class DeepSeekLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private readonly url = 'https://api.deepseek.com/chat/completions';

  constructor(apiKey: string, model?: string) { this.apiKey = apiKey; this.model = model || 'deepseek-chat'; }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 60000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.7, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`DeepSeek: ${await readErrorBody(response)}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('DeepSeek: 无响应体');
      yield* parseSSEStream(reader);
    } finally { clearTimeout(timer); }
  }

  async verifyKey(): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: 'hi' }] }),
      });
      return response.status !== 401 && response.status !== 403;
    } catch { return false; }
  }

  getProviderName(): string { return 'DeepSeek'; }
}

export class QwenLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private readonly url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  constructor(apiKey: string, model?: string) { this.apiKey = apiKey; this.model = model || 'qwen-turbo'; }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 60000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable',
        },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.7, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`通义千问: ${await readErrorBody(response)}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('通义千问: 无响应体');
      yield* parseSSEStream(reader);
    } finally { clearTimeout(timer); }
  }

  async verifyKey(): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable',
        },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: 'hi' }] }),
      });
      return response.status !== 401 && response.status !== 403;
    } catch { return false; }
  }

  getProviderName(): string { return '通义千问'; }
}

export class BaiduLLMClient implements LLMClient {
  private apiKey: string;
  private secretKey: string;
  private accessToken: string = '';
  private readonly chatUrl = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
  private readonly tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';

  constructor(apiKey: string, secretKey = '') { this.apiKey = apiKey; this.secretKey = secretKey; }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    const response = await fetch(`${this.tokenUrl}?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`, { method: 'POST' });
    const data = await response.json<{ access_token?: string; error?: string }>();
    if (data.error) throw new Error(`百度UNIT: 获取token失败 - ${data.error}`);
    this.accessToken = data.access_token || '';
    return this.accessToken;
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 60000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.chatUrl}?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`百度UNIT: ${await readErrorBody(response)}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('百度UNIT: 无响应体');
      yield* parseSSEStream(reader);
    } finally { clearTimeout(timer); }
  }

  async verifyKey(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch { return false; }
  }

  getProviderName(): string { return '百度UNIT'; }
}

export class OpenAICompatibleLLMClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, config: string, model?: string) {
    this.apiKey = apiKey;
    const parts = config.split('|');
    this.baseUrl = parts[0] || 'https://api.openai.com/v1/chat/completions';
    this.model = model || parts[1] || 'gpt-3.5-turbo';
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 60000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages, temperature: 0.7, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OpenAI兼容: ${await readErrorBody(response)}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('OpenAI兼容: 无响应体');
      yield* parseSSEStream(reader);
    } finally { clearTimeout(timer); }
  }

  async verifyKey(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: 'hi' }] }),
      });
      return response.status !== 401 && response.status !== 403;
    } catch { return false; }
  }

  getProviderName(): string { return 'OpenAI兼容'; }
}

export function createLLMClient(provider: string, apiKey: string, secretKey?: string, model?: string): LLMClient {
  if (provider === '百度UNIT') return new BaiduLLMClient(apiKey, secretKey);
  if (provider === 'DeepSeek') return new DeepSeekLLMClient(apiKey, model);
  if (provider === 'OpenAI兼容') return new OpenAICompatibleLLMClient(apiKey, secretKey || '', model);
  if (provider === '通义千问') return new QwenLLMClient(apiKey, model);
  return new ZhipuLLMClient(apiKey, model);
}
