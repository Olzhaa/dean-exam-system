import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { getToken, getRole, getUsername, setToken, setRole, setUsername } from './api.js'
import Icon from './components/Icon.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employees.jsx'
import Exams from './pages/Exams.jsx'
import ProctorAssign from './pages/ProctorAssign.jsx'
import Rooms from './pages/Rooms.jsx'
import FxRequests from './pages/FxRequests.jsx'
import FxSchedule from './pages/FxSchedule.jsx'
import StudentLookup from './pages/StudentLookup.jsx'

const NAV_ADMIN = [
  { to: '/', icon: 'home', label: 'Басты бет', end: true },
  { to: '/employees', icon: 'users', label: 'Қызметкерлер' },
  { to: '/exams', icon: 'calendar', label: 'Емтихандар' },
  { to: '/proctors', icon: 'clipboard', label: 'Проктор бөлу' },
  { to: '/rooms', icon: 'building', label: 'Кабинеттер' },
  { to: '/fx/requests', icon: 'doc', label: 'FX өтініштер' },
  { to: '/fx/schedule', icon: 'table', label: 'FX кесте' },
  { to: '/student', icon: 'search', label: 'Студент іздеу' },
]

const NAV_USER = [
  { to: '/', icon: 'home', label: 'Басты бет', end: true },
  { to: '/student', icon: 'search', label: 'Студент іздеу' },
]

function Sidebar({ role, username, onLogout }) {
  const items = role === 'admin' ? NAV_ADMIN : NAV_USER
  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="brand">
        <Icon name="clipboard" size={28} strokeWidth={1.6} />
        <div>
          <div className="brand-title">Деканат</div>
          <div className="brand-sub">Емтихан жүйесі</div>
        </div>
      </div>
      <nav style={{ flex: 1 }}>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="user">
        <div className="user-name">{username}</div>
        <div className="user-role"><span className="badge">{role}</span></div>
        <button onClick={onLogout} style={{ width: '100%', justifyContent: 'center' }}>
          <Icon name="logout" size={16} />
          <span>Шығу</span>
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  const nav = useNavigate()
  const token = getToken()
  const role = getRole()
  const username = getUsername()

  function logout() {
    setToken(null); setRole(null); setUsername(null)
    nav('/login')
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="layout">
      <Sidebar role={role} username={username} onLogout={logout} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/proctors" element={<ProctorAssign />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/fx/requests" element={<FxRequests />} />
          <Route path="/fx/schedule" element={<FxSchedule />} />
          <Route path="/student" element={<StudentLookup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
