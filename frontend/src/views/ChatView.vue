<template>
  <el-container class="chat-layout">
    <el-aside width="220px" class="sidebar">
      <h3>会话列表</h3>
      <el-button type="success" size="small" @click="chatStore.createSession()" style="width:100%;margin-bottom:10px">新建会话</el-button>
      <el-menu @select="onSessionSelect">
        <el-menu-item v-for="s in chatStore.sessions" :key="s.session_id" :index="s.session_id">
          <span class="session-title">{{ s.title }}</span>
          <span class="rename-btn" @click.stop="onRenameSession(s)">✏️</span>
        </el-menu-item>
      </el-menu>
      <div class="nav-btns">
        <el-button size="small" @click="$router.push('/history')">历史记录</el-button>
        <el-button size="small" @click="$router.push('/profile')">个人中心</el-button>
        <el-button v-if="authStore.user?.role === '管理员'" size="small" @click="$router.push('/admin')">管理后台</el-button>
        <el-button size="small" type="danger" @click="onLogout">退出登录</el-button>
      </div>
    </el-aside>
    <el-main class="chat-main">
      <div class="messages" ref="messagesRef">
        <div v-for="(msg, i) in chatStore.messages" :key="i" :class="['message', msg.role]">
          <div class="role-label">{{ msg.role === 'user' ? '你' : '助手' }}</div>
          <div class="content" v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>
      <div class="input-area">
        <el-input v-model="question" type="textarea" :rows="3" placeholder="请输入学习问题..." :maxlength="4000" show-word-limit @keydown.enter.ctrl="onSend" />
        <el-button type="primary" :loading="chatStore.isLoading" @click="onSend" style="margin-left:10px">
          {{ chatStore.isLoading ? '等待中...' : '发 送' }}
        </el-button>
      </div>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useChatStore } from '../stores/useChatStore';
import { marked } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import api from '../services/apiService';
import { ElMessageBox } from 'element-plus';
import 'highlight.js/styles/github.css';

const renderer = new marked.Renderer();
renderer.code = function (code: string, infostring?: string) {
  const lang = infostring && hljs.getLanguage(infostring) ? infostring : '';
  const highlighted = lang
    ? hljs.highlight(code, { language: lang }).value
    : hljs.highlightAuto(code).value;
  return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const question = ref('');
const messagesRef = ref<HTMLElement>();

function renderMarkdown(content: string) {
  return DOMPurify.sanitize(marked.parse(content || '') as string);
}

async function onSend() {
  if (!question.value.trim() || chatStore.isLoading) return;
  await chatStore.askQuestion(question.value.trim());
  question.value = '';
  await nextTick();
  scrollToBottom();
}

function onSessionSelect(index: string) {
  chatStore.switchSession(index);
}

function scrollToBottom() {
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
}

watch(() => chatStore.messages.length, () => nextTick(scrollToBottom));

function onLogout() {
  authStore.logout();
  router.push('/login');
}

async function onRenameSession(s: { session_id: string; title: string }) {
  const { value } = await ElMessageBox.prompt('请输入新标题', '重命名', { inputValue: s.title, confirmButtonText: '确定', cancelButtonText: '取消' });
  if (value?.trim()) {
    await api.put(`/api/chat/sessions/${s.session_id}/title`, { title: value.trim() });
    await chatStore.loadSessions();
  }
}

onMounted(async () => {
  await chatStore.loadSessions();
  if (!chatStore.currentSessionId && chatStore.sessions.length > 0) {
    chatStore.switchSession(chatStore.sessions[0].session_id);
  }
});
</script>

<style scoped>
.chat-layout { height: 100vh; }
.sidebar { background: #fff; padding: 12px; border-right: 1px solid #e4e7ed; display: flex; flex-direction: column; }
.sidebar h3 { margin: 0 0 10px; color: #2c3e50; }
.nav-btns { margin-top: auto; display: flex; flex-direction: column; gap: 6px; }
.chat-main { display: flex; flex-direction: column; padding: 0; }
.messages { flex: 1; overflow-y: auto; padding: 16px; }
.message { margin-bottom: 16px; }
.message.user .role-label { color: #2c3e50; font-weight: bold; }
.message.assistant .role-label { color: #27ae60; font-weight: bold; }
.message .content { margin-top: 4px; padding: 8px 12px; border-radius: 8px; background: #fff; }
.message.user .content { background: #e8f4fd; }
.input-area { display: flex; padding: 12px; border-top: 1px solid #e4e7ed; background: #fff; }
.session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rename-btn { margin-left: 4px; cursor: pointer; font-size: 12px; flex-shrink: 0; opacity: 0; transition: opacity 0.2s; }
.el-menu-item:hover .rename-btn { opacity: 1; }
</style>
