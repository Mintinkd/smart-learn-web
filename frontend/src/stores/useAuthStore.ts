import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/apiService';

interface UserInfo {
  username: string;
  role: string;
  registered_at: string;
  last_login_at: string | null;
  total_questions: number;
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('access_token') || '');
  const refreshToken = ref(localStorage.getItem('refresh_token') || '');
  const user = ref<UserInfo | null>(null);
  const isAuthenticated = computed(() => !!accessToken.value);

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  async function login(username: string, password: string) {
    const { data } = await api.post('/api/auth/login', { username, password });
    if (data.code === 0) {
      setTokens(data.data.access_token, data.data.refresh_token);
      user.value = { username: data.data.username, role: data.data.role, registered_at: '', last_login_at: null, total_questions: 0 };
    }
    return data;
  }

  async function register(username: string, password: string) {
    const { data } = await api.post('/api/auth/register', { username, password });
    if (data.code === 0) {
      setTokens(data.data.access_token, data.data.refresh_token);
      user.value = { username: data.data.username, role: data.data.role, registered_at: '', last_login_at: null, total_questions: 0 };
    }
    return data;
  }

  async function refreshAccessToken(): Promise<boolean> {
    try {
      const { data } = await api.post('/api/auth/refresh', { refresh_token: refreshToken.value });
      if (data.code === 0) {
        setTokens(data.data.access_token, data.data.refresh_token);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  async function getUserInfo() {
    const { data } = await api.get('/api/user/profile');
    if (data.code === 0) user.value = data.data;
    return data;
  }

  function logout() {
    accessToken.value = '';
    refreshToken.value = '';
    user.value = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  return { accessToken, refreshToken, user, isAuthenticated, login, register, refreshAccessToken, getUserInfo, logout };
});