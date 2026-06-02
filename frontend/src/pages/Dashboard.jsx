import { useEffect, useState } from 'react'
import { api, getRole } from '../api.js'
import Icon from '../components/Icon.jsx'

export default function Dashboard() {
  const [stats, setStats] = useState({ employees: 0, employees_active: 0, exams: 0, rooms: 0, requests: 0, scheduled: 0 })
  const [loading, setLoading] = useState(true)
  const role = getRole()

  useEffect(() => {
    async function load() {
      try {
        const [exams, schedule] = await Promise.all([api.listExams(), api.listSchedule()])
        let employees = 0, employees_active = 0, rooms = 0, requests = 0
        if (role === 'admin') {
          const [emps, rms, reqs] = await Promise.all([api.listEmployees(), api.listRooms(), api.listRequests()])
          employees = emps.length
          employees_active = emps.filter(e => e.is_active).length
          rooms = rms.length
          requests = reqs.length
        }
        setStats({ employees, employees_active, exams: exams.length, rooms, requests, scheduled: schedule.length })
      } catch (e) {
        console.error(e)
      } finally { setLoading(false) }
    }
    load()
  }, [role])

  return (
    <div>
      <h1 className="page-title">Басты бет</h1>
      <div className="stat-grid">
        {role === 'admin' && (
          <StatCard icon="users" label="Қызметкерлер" value={stats.employees} sub={`${stats.employees_active} белсенді`} loading={loading} />
        )}
        <StatCard icon="calendar" label="Емтихандар" value={stats.exams} sub="Final" loading={loading} />
        {role === 'admin' && (
          <StatCard icon="building" label="Кабинеттер" value={stats.rooms} loading={loading} />
        )}
        {role === 'admin' && (
          <StatCard icon="doc" label="FX өтініштер" value={stats.requests} loading={loading} />
        )}
        <StatCard icon="table" label="FX кесте" value={stats.scheduled} sub="session" loading={loading} />
      </div>

      <div className="card">
        <h3>Қалай жұмыс істейді</h3>
        <ol style={{ lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
          <li><b>Қызметкерлер</b> — Т.А.Ә., кафедра, min/max лимиттерді енгізіңіз немесе Excel-ден жүктеңіз</li>
          <li><b>Емтихандар</b> — BS Excel файлды жүктеңіз немесе қолмен қосыңыз</li>
          <li><b>Проктор бөлу</b> — автоматты бөлуді іске қосыңыз (әр кабинетке 2 проктор)</li>
          <li><b>Кабинеттер</b> — FX үшін бос кабинеттерді сыйымдылықпен қосыңыз</li>
          <li><b>FX өтініштер</b> — FX.xlsx файлды жүктеңіз</li>
          <li><b>FX кесте</b> — күн/уақыт интервалын беріп, BS форматта экспорт</li>
        </ol>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, loading }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        <Icon name={icon} size={14} />
        <span>{label}</span>
      </div>
      <div className="stat-value">{loading ? '—' : value}</div>
      {sub && <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
