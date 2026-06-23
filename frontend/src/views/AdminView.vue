<template>
  <div class="admin-container">
    <h2>知识库管理</h2>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索知识条目..." clearable style="width:300px" @input="onSearch" />
      <el-button type="success" @click="onAdd">新增条目</el-button>
      <el-button type="primary" :disabled="!selectedEntry" @click="onEdit">编辑</el-button>
      <el-button type="danger" :disabled="!selectedEntry" @click="onDelete">删除</el-button>
    </div>
    <el-table :data="entries" highlight-current-row @current-change="onCurrentChange">
      <el-table-column prop="title" label="标题" min-width="200" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="tags" label="标签" width="200" />
      <el-table-column prop="created_at" label="创建时间" width="160">
        <template #default="{ row }">{{ row.created_at?.substring(0, 16) }}</template>
      </el-table-column>
      <el-table-column label="内置" width="80">
        <template #default="{ row }">{{ row.is_builtin ? '是' : '否' }}</template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑知识条目' : '新增知识条目'" width="600px">
      <el-form>
        <el-form-item label="标题"><el-input v-model="form.title" :maxlength="100" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="form.category" :maxlength="50" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="form.tags" placeholder="多个标签用逗号分隔" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="8" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../services/apiService';
import { ElMessage, ElMessageBox } from 'element-plus';

const entries = ref<any[]>([]);
const keyword = ref('');
const selectedEntry = ref<any>(null);
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = ref({ title: '', content: '', category: '', tags: '' });

async function loadEntries(kw?: string) {
  const { data } = await api.get('/api/admin/knowledge', { params: kw ? { keyword: kw } : {} });
  if (data.code === 0) entries.value = data.data;
}

function onSearch() { loadEntries(keyword.value.trim() || undefined); }
function onCurrentChange(row: any) { selectedEntry.value = row; }

function onAdd() {
  isEdit.value = false;
  form.value = { title: '', content: '', category: '', tags: '' };
  dialogVisible.value = true;
}

function onEdit() {
  if (!selectedEntry.value) return;
  isEdit.value = true;
  form.value = { title: selectedEntry.value.title, content: selectedEntry.value.content, category: selectedEntry.value.category, tags: selectedEntry.value.tags };
  dialogVisible.value = true;
}

async function onSave() {
  if (!form.value.title || !form.value.content || !form.value.category) { ElMessage.warning('标题、内容和分类为必填项'); return; }
  if (isEdit.value && selectedEntry.value) {
    await api.put(`/api/admin/knowledge/${selectedEntry.value.entry_id}`, form.value);
  } else {
    await api.post('/api/admin/knowledge', form.value);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  loadEntries();
}

async function onDelete() {
  if (!selectedEntry.value) return;
  if (selectedEntry.value.is_builtin) { ElMessage.warning('系统内置条目不可删除'); return; }
  await ElMessageBox.confirm('确定删除该知识条目？', '确认删除');
  await api.delete(`/api/admin/knowledge/${selectedEntry.value.entry_id}`);
  ElMessage.success('删除成功');
  loadEntries();
}

onMounted(() => loadEntries());
</script>

<style scoped>
.admin-container { max-width: 1000px; margin: 20px auto; padding: 20px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; }
</style>