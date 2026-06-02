import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Exams() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({
    course_code: '', duration: 90, room_number: '', required_proctors: 2, exam_date: '', exam_time: '09:00',
  })
  const [err, setErr] = useState('')

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

  return (
    <div>
      <h1 className="page-title">Емтихандар (Final)</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Жаңа емтихан</h3>
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
            <div className="field" style={{ flex: 1 }}>
              <label>Кабинет</label>
              <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="101" required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Қажет проктор</label>
              <input type="number" min="1" value={form.required_proctors} onChange={(e) => setForm({ ...form, required_proctors: e.target.value })} />
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
          <tr><th>Пән</th><th>Күн</th><th>Уақыт</th><th>Ұзақтығы</th><th>Кабинет</th><th>Прокторлар</th><th></th></tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td><b>{e.course_code}</b></td>
              <td>{e.exam_date}</td>
              <td>{e.exam_time?.slice(0, 5)}</td>
              <td>{e.duration} мин</td>
              <td>{e.room_number}</td>
              <td>{e.required_proctors}</td>
              <td><button className="danger" onClick={() => remove(e.id)}>Жою</button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af' }}>Емтихан жоқ</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
