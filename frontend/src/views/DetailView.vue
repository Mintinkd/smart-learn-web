<template>
  <div class="detail-container">
    <h2>{{ sessionDetail?.session?.title || '会话详情' }}</h2>
    <div v-if="sessionDetail" class="conversation">
      <div v-for="(msg, i) in sessionDetail.records" :key="i" class="message">
        <div class="role">问：</div>
        <div class="content">{{ msg.question }}</div>
        <div class="role">答：</div>
        <div class="content" v-html="renderMarkdown(msg.answer)"></div>
      </div>
    </div>
    <div class="actions">
      <el-button type="success" @click="continueChat">继续提问</el-button>
      <el-button @click="$router.back()">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/apiService';
import { useChatStore } from '../stores/useChatStore';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const sessionId = route.params.id as string;
const sessionDetail = ref<any>(null);

function renderMarkdown(content: string) { return DOMPurify.sanitize(marked.parse(content || '') as string); }

async function continueChat() {
  await chatStore.switchSession(sessionId);
  router.push('/chat');
}

onMounted(async () => {
  const { data } = await api.get(`/api/history/sessions/${sessionId}`);
  if (data.code === 0) sessionDetail.value = data.data;
});
</script>

<style scoped>
.detail-container { max-width: 800px; margin: 20px auto; padding: 20px; }
.conversation { margin-bottom: 20px; }
.message { margin-bottom: 16px; padding: 12px; border-radius: 8px; background: #fff; border: 1px solid #ecf0f1; }
.role { font-weight: bold; color: #2c3e50; margin-bottom: 4px; }
.content { margin-bottom: 8px; line-height: 1.6; }
.actions { display: flex; gap: 10px; }
</style>
