import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
    { path: '/chat', name: 'Chat', component: () => import('../views/ChatView.vue'), meta: { requiresAuth: true } },
    { path: '/history', name: 'History', component: () => import('../views/HistoryView.vue'), meta: { requiresAuth: true } },
    { path: '/detail/:id', name: 'Detail', component: () => import('../views/DetailView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'Profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/admin', name: 'Admin', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/', redirect: '/chat' },
  ]
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.meta.requiresAdmin && authStore.user?.role !== '管理员') {
    next({ name: 'Chat' });
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Chat' });
  } else {
    next();
  }
});

export default router;