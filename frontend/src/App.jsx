import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { getToken, getRole, getUsername, setToken, setRole, setUsername } from './api.js'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Employees from './pages/Employees.jsx'
import Exams from './pages/Exams.jsx'
import ProctorAssign from './pages/ProctorAssign.jsx'
import Rooms from './pages/Rooms.jsx'
import FxRequests from './pages/FxRequests.jsx'
import FxSchedule from './pages/FxSchedule.jsx'
import StudentLookup from './pages/StudentLookup.jsx'

function Sidebar({ role, username, onLogout }) {
  const link = ({ isActive }) => (isActive ? 'active' : '')
  return (
    <aside className="sidebar">
      <h2>📋 Деканат жүйесі</h2>
      <nav>
        <NavLink to="/" end className={link}>Басты бет</NavLink>
        {role === 'admin' && (
          <>
            <NavLink to="/employees" className={link}>Қызметкерлер</NavLink>
            <NavLink to="/exams" className={link}>Емтихандар</NavLink>
            <NavLink to="/proctors" className={link}>Проктор бөлу</NavLink>
            <NavLink to="/rooms" className={link}>Кабинеттер</NavLink>
            <NavLink to="/fx/requests" className={link}>FX өтініштер</NavLink>
            <NavLink to="/fx/schedule" className={link}>FX кесте</NavLink>
          </>
        )}
        <NavLink to="/student" className={link}>Студент іздеу</NavLink>
      </nav>
      <div className="user">
        <div>{username} <span className="badge">{role}</span></div>
        <button style={{ marginTop: 8, width: '100%' }} onClick={onLogout}>Шығу</button>
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
    setToken(null)
    setRole(null)
    setUsername(null)
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
