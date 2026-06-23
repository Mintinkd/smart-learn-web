<template>
  <div class="detail-container">
    <h2>问答详情</h2>
    <div v-if="detail" class="conversation">
      <div v-for="(msg, i) in detail.session_context" :key="i" :class="['message', msg.record_id === recordId ? 'current' : '']">
        <div class="role">{{ msg.record_id === recordId ? '★ ' : '' }}问：</div>
        <div class="content">{{ msg.question }}</div>
        <div class="role">答：</div>
        <div class="content" v-html="renderMarkdown(msg.answer)"></div>
      </div>
    </div>
    <div class="actions">
      <el-button type="primary" @click="copyText(detail?.record?.question || '')">复制问题</el-button>
      <el-button type="primary" @click="copyText(detail?.record?.answer || '')">复制解答</el-button>
      <el-button type="success" @click="continueChat">继续提问</el-button>
      <el-button @click="$router.back()">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useChatStore } from '../stores/useChatStore';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';

const route = useRoute();
const router = useRouter();
const historyStore = useHistoryStore();
const chatStore = useChatStore();
const recordId = route.params.id as string;
const detail = ref<any>(null);

function renderMarkdown(content: string) { return marked.parse(content || ''); }

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制');
  } catch { ElMessage.warning('复制失败，请手动选择复制'); }
}

async function continueChat() {
  if (detail.value?.record?.session_id) {
    await chatStore.switchSession(detail.value.record.session_id);
    router.push('/chat');
  }
}

onMounted(async () => {
  const data = await historyStore.getDetail(recordId);
  if (data.code === 0) detail.value = data.data;
});
</script>

<style scoped>
.detail-container { max-width: 800px; margin: 20px auto; padding: 20px; }
.conversation { margin-bottom: 20px; }
.message { margin-bottom: 16px; padding: 12px; border-radius: 8px; background: #fff; border: 1px solid #ecf0f1; }
.message.current { background: #e8f4fd; border-color: #3498db; }
.role { font-weight: bold; color: #2c3e50; margin-bottom: 4px; }
.content { margin-bottom: 8px; line-height: 1.6; }
.actions { display: flex; gap: 10px; }
</style>