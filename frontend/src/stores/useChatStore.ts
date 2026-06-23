import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/apiService';
import { sseService } from '../services/sseService';

interface Session { session_id: string; title: string; created_at: string; }
interface Message { role: 'user' | 'assistant'; content: string; }

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref('');
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);
  const sseConnectionId = ref('');

  async function loadSessions() {
    const { data } = await api.get('/api/chat/sessions');
    if (data.code === 0) sessions.value = data.data;
  }

  async function createSession() {
    const { data } = await api.post('/api/chat/sessions');
    if (data.code === 0) {
      currentSessionId.value = data.data.session_id;
      messages.value = [];
      await loadSessions();
    }
    return data;
  }

  async function switchSession(sessionId: string) {
    currentSessionId.value = sessionId;
    messages.value = [];
    const { data } = await api.get(`/api/chat/sessions/${sessionId}/history`);
    if (data.code === 0) {
      for (const record of data.data) {
        messages.value.push({ role: 'user', content: record.question });
        messages.value.push({ role: 'assistant', content: record.answer });
      }
    }
  }

  async function askQuestion(question: string) {
    if (!currentSessionId.value) await createSession();
    messages.value.push({ role: 'user', content: question });
    isLoading.value = true;
    let answerContent = '';

    const connectionId = await sseService.connect(
      `${import.meta.env.VITE_API_BASE_URL || ''}/api/chat/ask`,
      { session_id: currentSessionId.value, question },
      {
        onToken: (content) => {
          answerContent += content;
          const lastMsg = messages.value[messages.value.length - 1];
          if (lastMsg?.role === 'assistant') lastMsg.content = answerContent;
          else messages.value.push({ role: 'assistant', content: answerContent });
        },
        onDone: () => {
          isLoading.value = false;
          loadSessions();
        },
        onError: (msg) => {
          messages.value.push({ role: 'assistant', content: `[错误] ${msg}` });
          isLoading.value = false;
        },
      }
    );
    sseConnectionId.value = connectionId;
  }

  async function deleteSession(sessionId: string) {
    await api.delete(`/api/chat/sessions/${sessionId}`);
    await loadSessions();
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = '';
      messages.value = [];
    }
  }

  function stopGeneration() {
    if (sseConnectionId.value) {
      sseService.disconnect(sseConnectionId.value);
      isLoading.value = false;
    }
  }

  return { sessions, currentSessionId, messages, isLoading, loadSessions, createSession, switchSession, askQuestion, deleteSession, stopGeneration };
});