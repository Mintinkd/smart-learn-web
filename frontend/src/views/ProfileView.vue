<template>
  <div class="profile-container">
    <h2>个人中心</h2>
    <el-descriptions title="用户信息" :column="2" border v-if="authStore.user" style="margin-bottom:20px">
      <el-descriptions-item label="用户名">{{ authStore.user.username }}</el-descriptions-item>
      <el-descriptions-item label="角色">{{ authStore.user.role }}</el-descriptions-item>
      <el-descriptions-item label="注册时间">{{ authStore.user.registered_at?.substring(0, 16) }}</el-descriptions-item>
      <el-descriptions-item label="累计提问">{{ authStore.user.total_questions }}次</el-descriptions-item>
    </el-descriptions>

    <el-card style="margin-bottom:20px">
      <template #header>修改密码</template>
      <el-form style="max-width:400px">
        <el-form-item><el-input v-model="oldPwd" type="password" placeholder="原密码" show-password /></el-form-item>
        <el-form-item><el-input v-model="newPwd" type="password" placeholder="新密码（6位以上，含字母和数字）" show-password /></el-form-item>
        <el-button type="primary" @click="onChangePassword">修改密码</el-button>
      </el-form>
    </el-card>

    <el-card style="margin-bottom:20px">
      <template #header>API配置</template>
      <el-form style="max-width:400px">
        <el-form-item label="服务提供商">
          <el-select v-model="apiProvider" @change="onProviderChange">
            <el-option label="智谱AI" value="智谱AI" />
            <el-option label="DeepSeek" value="DeepSeek" />
            <el-option label="通义千问" value="通义千问" />
            <el-option label="百度UNIT" value="百度UNIT" />
            <el-option label="OpenAI兼容" value="OpenAI兼容" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="apiModel" v-if="providerModels.length" filterable allow-create>
            <el-option v-for="m in providerModels" :key="m" :label="m" :value="m" />
          </el-select>
          <el-input v-else v-model="apiModel" placeholder="输入模型名称" />
        </el-form-item>
        <el-form-item><el-input v-model="apiKey" type="password" placeholder="API密钥" show-password /></el-form-item>
        <el-button @click="onVerifyKey">验证密钥</el-button>
        <el-button type="primary" @click="onSaveApi">保存配置</el-button>
      </el-form>
    </el-card>

    <el-button type="success" @click="onExport">导出历史数据</el-button>
    <el-button type="danger" @click="onLogout" style="margin-left:10px">退出登录</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import api from '../services/apiService';
import { ElMessage } from 'element-plus';

const router = useRouter();
const authStore = useAuthStore();
const oldPwd = ref('');
const newPwd = ref('');
const apiProvider = ref('智谱AI');
const apiModel = ref('');
const apiKey = ref('');

const MODEL_OPTIONS: Record<string, string[]> = {
  '智谱AI': ['glm-4-flash', 'glm-4', 'glm-4-plus', 'glm-4-long'],
  'DeepSeek': ['deepseek-chat', 'deepseek-reasoner'],
  '通义千问': ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
  '百度UNIT': ['ERNIE-Bot 4.0', 'ERNIE-Bot', 'ERNIE-Bot-turbo'],
  'OpenAI兼容': [],
};

const providerModels = ref<string[]>(MODEL_OPTIONS['智谱AI']);

function onProviderChange() {
  providerModels.value = MODEL_OPTIONS[apiProvider.value] || [];
  apiModel.value = providerModels.value[0] || '';
}

async function onChangePassword() {
  if (!oldPwd.value || !newPwd.value) { ElMessage.warning('请输入原密码和新密码'); return; }
  const { data } = await api.put('/api/user/password', { old_password: oldPwd.value, new_password: newPwd.value });
  if (data.code === 0) { ElMessage.success('密码修改成功，请重新登录'); onLogout(); }
  else ElMessage.error(data.message);
}

async function onVerifyKey() {
  if (!apiKey.value) { ElMessage.warning('请输入API密钥'); return; }
  const { data } = await api.post('/api/chat/verify-api-key', { provider: apiProvider.value, api_key: apiKey.value });
  ElMessage(data.code === 0 && data.data?.valid ? { message: '验证通过', type: 'success' } : { message: '验证失败', type: 'error' });
}

async function onSaveApi() {
  const { data } = await api.put('/api/user/api-config', { provider: apiProvider.value, model: apiModel.value, api_key: apiKey.value });
  if (data.code === 0) ElMessage.success('配置已保存');
  else ElMessage.error(data.message);
}

async function onExport() {
  const { data } = await api.get('/api/history/export');
  if (data.code === 0) {
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'history_export.json'; a.click();
    URL.revokeObjectURL(url);
  }
}

function onLogout() { authStore.logout(); router.push('/login'); }

onMounted(async () => {
  await authStore.getUserInfo();
  const { data } = await api.get('/api/user/api-config');
  if (data.code === 0 && data.data) {
    apiProvider.value = data.data.provider || '智谱AI';
    apiModel.value = data.data.model || '';
    providerModels.value = MODEL_OPTIONS[apiProvider.value] || [];
  }
});
</script>

<style scoped>
.profile-container { max-width: 700px; margin: 20px auto; padding: 20px; }
</style>