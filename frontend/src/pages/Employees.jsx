import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Employees() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', min_proctor_count: 1, max_proctor_count: 5 })
  const [err, setErr] = useState('')

  async function load() {
    try { setList(await api.listEmployees()) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    setErr('')
    try {
      await api.createEmployee({ ...form, min_proctor_count: +form.min_proctor_count, max_proctor_count: +form.max_proctor_count })
      setForm({ name: '', min_proctor_count: 1, max_proctor_count: 5 })
      load()
    } catch (e) { setErr(e.message) }
  }

  async function remove(id) {
    if (!confirm('Жоюды растайсыз ба?')) return
    await api.deleteEmployee(id)
    load()
  }

  return (
    <div>
      <h1 className="page-title">Қызметкерлер</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Жаңа қызметкер</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field" style={{ flex: 3 }}>
              <label>Т.А.Ә.</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Min лимит</label>
              <input type="number" min="0" value={form.min_proctor_count} onChange={(e) => setForm({ ...form, min_proctor_count: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Max лимит</label>
              <input type="number" min="1" value={form.max_proctor_count} onChange={(e) => setForm({ ...form, max_proctor_count: e.target.value })} />
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
          <tr><th>Т.А.Ә.</th><th>Min</th><th>Max</th><th>Қазіргі</th><th></th></tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.min_proctor_count}</td>
              <td>{e.max_proctor_count}</td>
              <td>
                <span className={'badge ' + (e.current_proctor_count >= e.max_proctor_count ? 'warn' : e.current_proctor_count >= e.min_proctor_count ? 'ok' : '')}>
                  {e.current_proctor_count}
                </span>
              </td>
              <td><button className="danger" onClick={() => remove(e.id)}>Жою</button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af' }}>Қызметкер жоқ</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
