<template>
  <div class="history-container">
    <h2>历史记录</h2>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索关键词..." clearable style="width:300px" @input="onSearch" />
      <el-select v-model="selectedTag" placeholder="分类筛选" clearable @change="onTagFilter">
        <el-option v-for="t in historyStore.tags" :key="t.tag_id" :label="t.name" :value="t.name" />
      </el-select>
      <el-button type="danger" :disabled="!selectedRecords.length" @click="onDelete">删除选中 ({{ selectedRecords.length }})</el-button>
    </div>
    <el-table :data="historyStore.records" @selection-change="onSelectionChange" @row-dblclick="onRowDblClick">
      <el-table-column type="selection" width="50" />
      <el-table-column label="问题摘要" min-width="300">
        <template #default="{ row }">{{ row.question.substring(0, 50) }}{{ row.question.length > 50 ? '...' : '' }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="180">
        <template #default="{ row }">{{ row.created_at?.substring(0, 16) }}</template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="historyStore.total" :page-size="20" layout="prev, pager, next" @current-change="onPageChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useHistoryStore } from '../stores/useHistoryStore';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const historyStore = useHistoryStore();
const keyword = ref('');
const selectedTag = ref('');
const selectedRecords = ref<string[]>([]);
const page = ref(1);
let searchTimer: ReturnType<typeof setTimeout>;

function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (keyword.value.trim()) historyStore.search(keyword.value.trim());
    else historyStore.loadRecords(page.value);
  }, 300);
}

function onTagFilter() {
  if (selectedTag.value) historyStore.filterByTag(selectedTag.value);
  else historyStore.loadRecords(page.value);
}

function onSelectionChange(rows: Array<{ record_id: string }>) {
  selectedRecords.value = rows.map(r => r.record_id);
}

async function onDelete() {
  await ElMessageBox.confirm(`确定删除选中的 ${selectedRecords.value.length} 条记录？`, '确认删除');
  await historyStore.deleteRecords(selectedRecords.value);
  ElMessage.success('删除成功');
}

function onRowDblClick(row: { record_id: string }) {
  router.push(`/detail/${row.record_id}`);
}

function onPageChange(p: number) {
  historyStore.loadRecords(p);
}

onMounted(async () => {
  await historyStore.loadRecords(1);
  await historyStore.loadTags();
});
</script>

<style scoped>
.history-container { max-width: 900px; margin: 20px auto; padding: 20px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
</style>