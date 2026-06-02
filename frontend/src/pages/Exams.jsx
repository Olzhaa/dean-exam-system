import { useEffect, useRef, useState } from 'react'
import { api, getToken } from '../api.js'
import Icon from '../components/Icon.jsx'

export default function Exams() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({
    course_code: '', duration: 90, room_number: '', required_proctors: 2, exam_date: '', exam_time: '09:00',
  })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  async function load() { try { setList(await api.listExams()) } catch (e) { setErr(e.message) } }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    setErr('')
    try {
      await api.createExam({
        ...form,
        duration: +form.duration,
        required_proctors: +form.required_proctors,
      })
      setForm({ course_code: '', duration: 90, room_number: '', required_proctors: 2, exam_date: form.exam_date, exam_time: '09:00' })
      load()
    } catch (e) { setErr(e.message) }
  }

  async function remove(id) {
    if (!confirm('Жоюды растайсыз ба?')) return
    await api.deleteExam(id); load()
  }

  async function onImportBS(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(''); setMsg('')
    try {
      const r = await api.importExamsBS(f)
      setMsg(`${r.added} емтихан қосылды, ${r.skipped} өткізілді`)
      if (r.errors?.length) setErr(r.errors.join('; '))
      load()
    } catch (ex) { setErr(ex.message) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  async function exportBS() {
    // download with auth token
    const token = getToken()
    try {
      const res = await fetch(api.exportExamsBSUrl(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Экспорт қатесі')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'exam_schedule_with_proctors.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { setErr(e.message) }
  }

  return (
    <div>
      <h1 className="page-title">Емтихандар (Final)</h1>

      <div className="card">
        <h3><Icon name="upload" size={16} style={{ marginRight: 6 }} /> SDU BS Excel импорт</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Деканат файлын жүктеңіз (header 9-шы жолда). Жүйе курс, күн, уақыт, пән, кабинеттер, ұзақтығын автоматты оқиды.
        </p>
        <div className="row">
          <div className="field" style={{ flex: 2 }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onImportBS} />
          </div>
          <button className="cta no-grow" onClick={exportBS} disabled={list.length === 0}>
            <Icon name="download" size={14} /> Прокторлармен экспорт
          </button>
        </div>
        {msg && <div className="success">{msg}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Қолмен қосу</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <label>Пән коды</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} placeholder="MDE 304" required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Ұзақтығы (мин)</label>
              <input type="number" min="15" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Кабинет(тер)</label>
              <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="G 112, G 113" required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Кабинетке проктор</label>
              <input type="number" min="0" value={form.required_proctors} onChange={(e) => setForm({ ...form, required_proctors: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Күн</label>
              <input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Уақыт</label>
              <input type="time" value={form.exam_time} onChange={(e) => setForm({ ...form, exam_time: e.target.value })} required />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button className="primary" type="submit">Қосу</button>
            </div>
          </div>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <table>
        <thead>
          <tr>
            <th>Курс</th><th>Пән</th><th>Күн</th><th>Уақыт</th>
            <th>Кабинеттер</th><th>Студ.</th><th>Кабинетке проктор</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td>{e.course_year || '—'}</td>
              <td>
                <b>{e.course_code}</b>
                {e.course_name && <div style={{ fontSize: 11, color: '#6b7280' }}>{e.course_name}</div>}
              </td>
              <td>{e.exam_date}</td>
              <td>{e.exam_time?.slice(0, 5)} ({e.duration}м)</td>
              <td style={{ fontSize: 12 }}>
                {e.rooms_list && e.rooms_list.length > 0
                  ? e.rooms_list.map(r => <span key={r} className="badge" style={{ marginRight: 4 }}>{r}</span>)
                  : <span style={{ color: '#9ca3af' }}>—</span>}
              </td>
              <td>{e.student_count || '—'}</td>
              <td>{e.required_proctors}</td>
              <td><button className="danger" onClick={() => remove(e.id)} title="Жою"><Icon name="trash" size={14} /></button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', color: '#9ca3af' }}>Емтихан жоқ</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
