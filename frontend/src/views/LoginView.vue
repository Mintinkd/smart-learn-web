<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="title">智能学习助手</h2>
      <p class="subtitle">人工智能问答/答疑系统</p>
      <el-form @submit.prevent="onSubmit">
        <el-form-item>
          <el-input v-model="username" placeholder="用户名（3-20字符，字母数字下划线）" :maxlength="20" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" type="password" placeholder="密码（6位以上，含字母和数字）" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onLogin" :loading="loading" style="width:48%">登 录</el-button>
          <el-button type="success" @click="onRegister" :loading="loading" style="width:48%">注 册</el-button>
        </el-form-item>
      </el-form>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { ElMessage } from 'element-plus';

const router = useRouter();
const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function onLogin() {
  if (!username.value || !password.value) { errorMsg.value = '请输入用户名和密码'; return; }
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await authStore.login(username.value, password.value);
    if (data.code === 0) { router.push('/chat'); }
    else { errorMsg.value = data.message; }
  } catch { errorMsg.value = '网络错误'; }
  finally { loading.value = false; }
}

async function onRegister() {
  if (!username.value || !password.value) { errorMsg.value = '请输入用户名和密码'; return; }
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await authStore.register(username.value, password.value);
    if (data.code === 0) { ElMessage.success('注册成功'); router.push('/chat'); }
    else { errorMsg.value = data.message; }
  } catch { errorMsg.value = '网络错误'; }
  finally { loading.value = false; }
}

function onSubmit() { onLogin(); }
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7fa; }
.login-card { width: 420px; padding: 20px; }
.title { text-align: center; color: #2c3e50; margin-bottom: 4px; }
.subtitle { text-align: center; color: #7f8c8d; font-size: 13px; margin-bottom: 20px; }
.error { color: #e74c3c; text-align: center; font-size: 13px; margin-top: 8px; }
</style>