<template>
  <div class="history-container">
    <h2>历史会话</h2>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索关键词..." clearable style="width:300px" @input="onSearch" />
      <el-button type="danger" :disabled="!selectedSessions.length" @click="onDelete">删除选中 ({{ selectedSessions.length }})</el-button>
    </div>
    <el-table :data="sessions" @selection-change="onSelectionChange" @row-click="onRowClick">
      <el-table-column type="selection" width="50" />
      <el-table-column label="会话标题" min-width="300">
        <template #default="{ row }">{{ row.title }}</template>
      </el-table-column>
      <el-table-column label="消息数" width="100">
        <template #default="{ row }">{{ row.message_count }}</template>
      </el-table-column>
      <el-table-column label="首条问题" min-width="200">
        <template #default="{ row }">{{ row.first_question }}{{ row.first_question?.length >= 50 ? '...' : '' }}</template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180">
        <template #default="{ row }">{{ row.updated_at?.substring(0, 16) }}</template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" @current-change="onPageChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/apiService';
import { useChatStore } from '../stores/useChatStore';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const chatStore = useChatStore();
const sessions = ref<any[]>([]);
const total = ref(0);
const keyword = ref('');
const selectedSessions = ref<string[]>([]);
const page = ref(1);
let searchTimer: ReturnType<typeof setTimeout>;

async function loadSessions(p = 1, kw?: string) {
  const params: any = { page: p, size: 20 };
  if (kw) params.keyword = kw;
  const { data } = await api.get('/api/history/sessions', { params });
  if (data.code === 0) {
    sessions.value = data.data.items || data.data;
    total.value = data.data.total || 0;
  }
}

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadSessions(1, keyword.value.trim() || undefined);
  }, 300);
}

function onSelectionChange(rows: Array<{ session_id: string }>) {
  selectedSessions.value = rows.map(r => r.session_id);
}

async function onDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedSessions.value.length} 个会话？`, '确认删除');
  await api.delete('/api/history/sessions', { data: { session_ids: selectedSessions.value } });
  ElMessage.success('删除成功');
  loadSessions(page.value);
}

async function onRowClick(row: { session_id: string }) {
  await chatStore.switchSession(row.session_id);
  router.push('/chat');
}

function onPageChange(p: number) {
  loadSessions(p);
}

onMounted(() => loadSessions(1));
</script>

<style scoped>
.history-container { max-width: 900px; margin: 20px auto; padding: 20px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
</style>
