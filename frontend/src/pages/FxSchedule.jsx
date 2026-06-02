import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function FxSchedule() {
  const [form, setForm] = useState({ start_date: '', end_date: '', time_slots: '09:00, 11:30, 14:30', default_duration: 90 })
  const [list, setList] = useState([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() { try { setList(await api.listSchedule()) } catch (e) { setErr(e.message) } }
  useEffect(() => { load() }, [])

  async function generate(e) {
    e.preventDefault(); setErr(''); setMsg('')
    const slots = form.time_slots.split(',').map(s => s.trim()).filter(Boolean)
    try {
      const r = await api.generateSchedule({
        start_date: form.start_date,
        end_date: form.end_date,
        time_slots: slots,
        default_duration: +form.default_duration,
      })
      setMsg(r.message)
      load()
    } catch (ex) { setErr(ex.message) }
  }

  return (
    <div>
      <h1 className="page-title">FX кесте</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Кесте генерациясы</h3>
        <form onSubmit={generate}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Бастау күні</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Аяқтау күні</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Уақыт интервалдары (үтірмен)</label>
              <input value={form.time_slots} onChange={(e) => setForm({ ...form, time_slots: e.target.value })} placeholder="09:00, 11:30, 14:30" required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Әдепкі ұзақтығы (мин)</label>
              <input type="number" min="15" value={form.default_duration} onChange={(e) => setForm({ ...form, default_duration: e.target.value })} />
            </div>
            <div><button className="primary" type="submit">⚡ Генерациялау</button></div>
          </div>
        </form>
        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Дайын кесте ({list.length})</h3>
          {list.length > 0 && (
            <a href={api.exportScheduleUrl()} target="_blank" rel="noreferrer">
              <button className="primary">📥 Excel жүктеу</button>
            </a>
          )}
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Күн</th><th>Уақыт</th><th>Пән</th><th>Кабинет</th><th>Студенттер</th><th>Ұзақтығы</th></tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.exam_date}</td>
              <td>{r.exam_time?.slice(0, 5)}</td>
              <td><b>{r.course_code}</b></td>
              <td>{r.room_number || '—'}</td>
              <td>{r.student_count}</td>
              <td>{r.duration} мин</td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af' }}>Кесте әлі құрылмаған</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
