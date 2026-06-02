const BASE = import.meta.env.VITE_API_BASE || '/api'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(t) {
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}

export function getRole() {
  return localStorage.getItem('role')
}

export function setRole(r) {
  if (r) localStorage.setItem('role', r)
  else localStorage.removeItem('role')
}

export function getUsername() {
  return localStorage.getItem('username')
}

export function setUsername(u) {
  if (u) localStorage.setItem('username', u)
  else localStorage.removeItem('username')
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { ...opts, headers })
  if (!res.ok) {
    let detail
    try {
      const j = await res.json()
      detail = j.detail || JSON.stringify(j)
    } catch {
      detail = await res.text()
    }
    throw new Error(detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res
}

export const api = {
  // auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // employees
  listEmployees: () => request('/employees'),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleEmployeeActive: (id) => request(`/employees/${id}/toggle-active`, { method: 'POST' }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  importEmployees: async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const token = getToken()
    const res = await fetch(BASE + '/employees/import', {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail || 'Импорт қатесі')
    }
    return res.json()
  },

  // exams
  listExams: () => request('/exams'),
  createExam: (data) => request('/exams', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id, data) => request(`/exams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteExam: (id) => request(`/exams/${id}`, { method: 'DELETE' }),
  importExamsBS: async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const token = getToken()
    const res = await fetch(BASE + '/exams/import-bs', {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail || 'Импорт қатесі')
    }
    return res.json()
  },
  exportExamsBSUrl: () => BASE + '/exams/export-bs',

  // proctors
  autoAssign: (clear) => request(`/proctors/auto-assign?clear=${clear ? 'true' : 'false'}`, { method: 'POST' }),
  assignmentsFor: (examId) => request(`/proctors/assignments/${examId}`),
  manualAssign: (exam_id, employee_id) =>
    request('/proctors/manual', { method: 'POST', body: JSON.stringify({ exam_id, employee_id }) }),
  removeAssignment: (id) => request(`/proctors/assignment/${id}`, { method: 'DELETE' }),

  // rooms
  listRooms: () => request('/rooms'),
  createRoom: (data) => request('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // fx
  listRequests: () => request('/fx/requests'),
  addRequest: (data) => request('/fx/requests', { method: 'POST', body: JSON.stringify(data) }),
  deleteRequest: (id) => request(`/fx/requests/${id}`, { method: 'DELETE' }),
  importRequests: async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const token = getToken()
    const res = await fetch(BASE + '/fx/requests/import', {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail || 'Импорт қатесі')
    }
    return res.json()
  },
  importFxRaw: async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const token = getToken()
    const res = await fetch(BASE + '/fx/requests/import-fx', {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail || 'FX импорт қатесі')
    }
    return res.json()
  },
  generateSchedule: (data) => request('/fx/generate', { method: 'POST', body: JSON.stringify(data) }),
  listSchedule: () => request('/fx/schedule'),
  studentSchedule: (code) => request(`/fx/schedule/student?student_code=${encodeURIComponent(code)}`),
  exportScheduleUrl: () => BASE + '/fx/schedule/export',
  exportScheduleBSUrl: () => BASE + '/fx/schedule/export-bs',
}
