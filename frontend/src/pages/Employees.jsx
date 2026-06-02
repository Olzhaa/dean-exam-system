import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export default function Employees() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', department: '', min_proctor_count: 1, max_proctor_count: 5 })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('all')  // all | active | inactive
  const fileRef = useRef()

  async function load() {
    try { setList(await api.listEmployees()) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    setErr('')
    try {
      await api.createEmployee({
        ...form,
        min_proctor_count: +form.min_proctor_count,
        max_proctor_count: +form.max_proctor_count,
      })
      setForm({ name: '', department: '', min_proctor_count: 1, max_proctor_count: 5 })
      load()
    } catch (e) { setErr(e.message) }
  }

  async function toggleActive(id) {
    try { await api.toggleEmployeeActive(id); load() } catch (e) { setErr(e.message) }
  }

  async function remove(id) {
    if (!confirm('Жоюды растайсыз ба?')) return
    await api.deleteEmployee(id); load()
  }

  async function onImport(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(''); setMsg('')
    try {
      const r = await api.importEmployees(f)
      setMsg(`${r.added} жаңа қызметкер қосылды, ${r.skipped} өткізілді`)
      if (r.errors?.length) setErr(r.errors.join('; '))
      load()
    } catch (ex) { setErr(ex.message) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  const filtered = list.filter((e) =>
    filter === 'all' ? true : filter === 'active' ? e.is_active : !e.is_active
  )

  return (
    <div>
      <h1 className="page-title">Қызметкерлер</h1>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Excel/CSV арқылы импорт</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
          Бағандар: <code>name</code> (міндетті), <code>department</code>, <code>min_proctor_count</code>, <code>max_proctor_count</code>
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} />
        {msg && <div className="success">{msg}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Жаңа қызметкер</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field" style={{ flex: 3 }}>
              <label>Т.А.Ә.</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Кафедра</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Мысалы: ИТ" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Min</label>
              <input type="number" min="0" value={form.min_proctor_count} onChange={(e) => setForm({ ...form, min_proctor_count: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Max</label>
              <input type="number" min="1" value={form.max_proctor_count} onChange={(e) => setForm({ ...form, max_proctor_count: e.target.value })} />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button className="primary" type="submit">Қосу</button>
            </div>
          </div>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <div style={{ flex: '0 0 auto' }}>
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'primary' : ''}>Барлығы ({list.length})</button>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button onClick={() => setFilter('active')} className={filter === 'active' ? 'primary' : ''}>
            Белсенді ({list.filter(e => e.is_active).length})
          </button>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button onClick={() => setFilter('inactive')} className={filter === 'inactive' ? 'primary' : ''}>
            Белсенді емес ({list.filter(e => !e.is_active).length})
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Т.А.Ә.</th><th>Кафедра</th><th>Min</th><th>Max</th><th>Қазіргі</th><th>Күй</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.id} style={{ opacity: e.is_active ? 1 : 0.5 }}>
              <td>{e.name}</td>
              <td>{e.department || <span style={{ color: '#9ca3af' }}>—</span>}</td>
              <td>{e.min_proctor_count}</td>
              <td>{e.max_proctor_count}</td>
              <td>
                <span className={'badge ' + (e.current_proctor_count >= e.max_proctor_count ? 'warn' : e.current_proctor_count >= e.min_proctor_count ? 'ok' : '')}>
                  {e.current_proctor_count}
                </span>
              </td>
              <td>
                <span className={'badge ' + (e.is_active ? 'ok' : 'warn')}>
                  {e.is_active ? 'Белсенді' : 'Белсенді емес'}
                </span>
              </td>
              <td>
                <button onClick={() => toggleActive(e.id)} style={{ marginRight: 6 }}>
                  {e.is_active ? '⏸ Өшіру' : '▶ Қосу'}
                </button>
                <button className="danger" onClick={() => remove(e.id)}>Жою</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af' }}>Қызметкер жоқ</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
