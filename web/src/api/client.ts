const BASE = '/api';

export async function getLevels(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  const res = await fetch(`${BASE}/levels?${qs}`);
  return res.json();
}

export async function getLevel(id: number) {
  const res = await fetch(`${BASE}/levels/${id}`);
  return res.json();
}

export async function createLevel(data: any) {
  const res = await fetch(`${BASE}/levels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateLevel(id: number, data: any) {
  const res = await fetch(`${BASE}/levels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteLevel(id: number) {
  const res = await fetch(`${BASE}/levels/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function saveGameRecord(levelId: number, data: any) {
  const res = await fetch(`${BASE}/levels/${levelId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getGameRecords(levelId: number, page = 1) {
  const res = await fetch(`${BASE}/levels/${levelId}/records?page=${page}`);
  return res.json();
}
