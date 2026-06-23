export interface SSECallbacks {
  onToken: (content: string) => void;
  onDone: (data: { record_id: string }) => void;
  onError: (message: string) => void;
  onConnectionLost?: () => void;
}

export class SSEService {
  private controllers: Map<string, AbortController> = new Map();

  async connect(url: string, body: Record<string, unknown>, callbacks: SSECallbacks, maxRetries = 3): Promise<string> {
    const connectionId = crypto.randomUUID();
    const controller = new AbortController();
    this.controllers.set(connectionId, controller);

    const attempt = async (retriesLeft: number) => {
      try {
        const authStore = (await import('../stores/useAuthStore')).useAuthStore();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authStore.accessToken}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          callbacks.onError(`HTTP ${response.status}`);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) { callbacks.onError('No response body'); return; }

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { currentEvent = ''; continue; }
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
              continue;
            }
            if (trimmed.startsWith('data:')) {
              const rawData = trimmed.slice(5).trim();
              try {
                const parsed = JSON.parse(rawData);
                if (currentEvent === 'token') callbacks.onToken(parsed.content || '');
                else if (currentEvent === 'done') callbacks.onDone(parsed);
                else if (currentEvent === 'error') callbacks.onError(parsed.message || 'Unknown error');
                else callbacks.onToken(parsed.content || '');
              } catch { /* skip invalid JSON */ }
              currentEvent = '';
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        if (retriesLeft > 0) {
          const delay = Math.pow(2, maxRetries - retriesLeft) * 1000;
          await new Promise(r => setTimeout(r, delay));
          return attempt(retriesLeft - 1);
        }
        callbacks.onConnectionLost?.();
        callbacks.onError('连接失败');
      }
    };

    attempt(maxRetries);
    return connectionId;
  }

  disconnect(connectionId: string): void {
    const controller = this.controllers.get(connectionId);
    if (controller) {
      controller.abort();
      this.controllers.delete(connectionId);
    }
  }

  disconnectAll(): void {
    for (const [id] of this.controllers) this.disconnect(id);
  }
}

export const sseService = new SSEService();
