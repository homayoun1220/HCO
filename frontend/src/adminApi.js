import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'hco_admin_token'

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

function adminClient() {
  const token = getAdminToken()
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export async function adminLogin(password) {
  const { data } = await axios.post(`${API_BASE}/api/admin/login`, { password })
  setAdminToken(data.token)
  return data
}

export async function fetchAdminStats() {
  const { data } = await adminClient().get('/api/admin/stats')
  return data
}

export async function fetchAdminSessions() {
  const { data } = await adminClient().get('/api/admin/sessions')
  return data.sessions
}

export async function fetchAdminHealth() {
  const { data } = await adminClient().get('/api/admin/health')
  return data
}

export async function downloadAdminExport(clean = false) {
  const token = getAdminToken()
  const response = await axios.get(`${API_BASE}/api/admin/export`, {
    params: clean ? { clean: true } : {},
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', clean ? 'trials_clean.csv' : 'trials_export.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function fetchAdminAnalytics() {
  const { data } = await adminClient().get('/api/admin/analytics')
  return data
}

export async function fetchAdminSpeedTrials() {
  const { data } = await adminClient().get('/api/admin/speed-trials')
  return data
}

export async function fetchPublicHealth() {
  const { data } = await axios.get(`${API_BASE}/api/health`)
  return data
}
