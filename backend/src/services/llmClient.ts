export interface LLMClient {
  chatStream(messages: Array<{ role: string; content: string }>, timeout?: number): AsyncGenerator<string, void, unknown>;
  verifyKey(): Promise<boolean>;
  getProviderName(): string;
}

export class ZhipuLLMClient implements LLMClient {
  private apiKey: string;
  private readonly url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  constructor(apiKey: string) { this.apiKey = apiKey; }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 30000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'glm-4', messages, temperature: 0.7, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch { /* skip invalid JSON */ }
        }
      }
    } finally { clearTimeout(timer); }
  }

  async verifyKey(): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'glm-4', messages: [{ role: 'user', content: 'test' }], temperature: 0.7 }),
      });
      return response.status !== 401;
    } catch { return false; }
  }

  getProviderName(): string { return '智谱AI'; }
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
    const data = await response.json<{ access_token?: string }>();
    this.accessToken = data.access_token || '';
    return this.accessToken;
  }

  async *chatStream(messages: Array<{ role: string; content: string }>, timeout = 30000): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.chatUrl}?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json<{ result?: string }>();
      if (data.result) yield data.result;
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

export function createLLMClient(provider: string, apiKey: string, secretKey?: string): LLMClient {
  if (provider === '百度UNIT') return new BaiduLLMClient(apiKey, secretKey);
  return new ZhipuLLMClient(apiKey);
}