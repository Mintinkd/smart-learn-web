import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/apiService';

interface QARecord { record_id: string; question: string; answer: string; created_at: string; api_status: string; }
interface Tag { tag_id: string; name: string; }

export const useHistoryStore = defineStore('history', () => {
  const records = ref<QARecord[]>([]);
  const total = ref(0);
  const currentPage = ref(1);
  const tags = ref<Tag[]>([]);

  async function loadRecords(page = 1, size = 20) {
    const { data } = await api.get('/api/history/records', { params: { page, size } });
    if (data.code === 0) {
      records.value = data.data.items || data.data;
      total.value = data.data.total || data.data.length || 0;
      currentPage.value = page;
    }
  }

  async function filterByTag(tag: string) {
    const { data } = await api.get('/api/history/records', { params: { tag } });
    if (data.code === 0) records.value = data.data;
  }

  async function search(keyword: string) {
    const { data } = await api.get('/api/history/records', { params: { keyword } });
    if (data.code === 0) records.value = data.data;
  }

  async function deleteRecords(recordIds: string[]) {
    await api.delete('/api/history/records', { data: { record_ids: recordIds } });
    await loadRecords(currentPage.value);
  }

  async function getDetail(recordId: string) {
    const { data } = await api.get(`/api/history/records/${recordId}`);
    return data;
  }

  async function loadTags() {
    const { data } = await api.get('/api/history/tags');
    if (data.code === 0) tags.value = data.data;
  }

  return { records, total, currentPage, tags, loadRecords, filterByTag, search, deleteRecords, getDetail, loadTags };
});