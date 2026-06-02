import { useEffect, useState } from 'react'
import { api, getRole } from '../api.js'

export default function Dashboard() {
  const [stats, setStats] = useState({ employees: 0, exams: 0, rooms: 0, requests: 0, scheduled: 0 })
  const role = getRole()

  useEffect(() => {
    async function load() {
      try {
        const [exams, schedule] = await Promise.all([api.listExams(), api.listSchedule()])
        let employees = 0, rooms = 0, requests = 0
        if (role === 'admin') {
          const [emps, rms, reqs] = await Promise.all([api.listEmployees(), api.listRooms(), api.listRequests()])
          employees = emps.length; rooms = rms.length; requests = reqs.length
        }
        setStats({ employees, exams: exams.length, rooms, requests, scheduled: schedule.length })
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [role])

  return (
    <div>
      <h1 className="page-title">Басты бет</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <StatCard label="Қызметкерлер" value={stats.employees} />
        <StatCard label="Емтихандар (Final)" value={stats.exams} />
        <StatCard label="Кабинеттер" value={stats.rooms} />
        <StatCard label="FX өтініштер" value={stats.requests} />
        <StatCard label="FX кестесі (пәндер)" value={stats.scheduled} />
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Қалай жұмыс істейді</h3>
        <ol style={{ lineHeight: 1.8 }}>
          <li><b>Қызметкерлер</b> — Т.А.Ә., min/max лимиттерді енгізіңіз</li>
          <li><b>Емтихандар</b> — Final емтихандарды қосыңыз (пән, күн, уақыт, кабинет)</li>
          <li><b>Проктор бөлу</b> — автоматты бөлуді іске қосыңыз немесе қолмен таңдаңыз</li>
          <li><b>Кабинеттер</b> — FX үшін бос кабинеттерді сыйымдылықпен қосыңыз</li>
          <li><b>FX өтініштер</b> — Excel/CSV арқылы жүктеңіз немесе қолмен қосыңыз</li>
          <li><b>FX кесте</b> — күндер мен уақыт интервалдарын беріп, кестені автогенерациялаңыз</li>
        </ol>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}
