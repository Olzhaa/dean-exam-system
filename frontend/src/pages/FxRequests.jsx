import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

export default function FxRequests() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ student_code: '', student_name: '', course_code: '' })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef()
  const fileRefSimple = useRef()

  async function load() { try { setList(await api.listRequests()) } catch (e) { setErr(e.message) } }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault(); setErr('')
    try {
      await api.addRequest(form)
      setForm({ student_code: '', student_name: '', course_code: '' })
      load()
    } catch (e) { setErr(e.message) }
  }

  async function remove(id) {
    if (!confirm('Жоюды растайсыз ба?')) return
    await api.deleteRequest(id); load()
  }

  async function onImport(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(''); setMsg('')
    try {
      const r = await api.importRequests(f)
      setMsg(`${r.added} жаңа өтініш қосылды, ${r.skipped} өткізілді`)
      load()
    } catch (ex) { setErr(ex.message) }
    finally { if (fileRefSimple.current) fileRefSimple.current.value = '' }
  }

  async function onImportFx(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(''); setMsg('')
    try {
      const r = await api.importFxRaw(f)
      setMsg(`${r.added} тіркеу қосылды, ${r.skipped} өткізілді`)
      if (r.errors?.length) setErr(r.errors.join('; '))
      load()
    } catch (ex) { setErr(ex.message) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div>
      <h1 className="page-title">FX өтініштер</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>📥 SDU FX тізімі (FX.xlsx)</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
          Бағандар: <code>COURSE_CODE</code>, <code>COURSE_TITLE</code>, <code>INSTRUCTOR</code>, <code>SECTION</code>, <code>STUD_ID</code>, <code>STUD_FULL_NAME</code>, <code>FACULTY</code>, <code>CIPHER</code>, <code>SPECIALITY</code>, <code>ECTS</code>
        </p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onImportFx} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Қарапайым CSV импорт</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
          Бағандар: <code>student_code</code>, <code>student_name</code>, <code>course_code</code>
        </p>
        <input ref={fileRefSimple} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} />
        {msg && <div className="success">{msg}</div>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Қолмен қосу</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Студент коды</label>
              <input value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Студент Т.А.Ә.</label>
              <input value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Пән коды</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} required />
            </div>
            <div><button className="primary" type="submit">Қосу</button></div>
          </div>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <table>
        <thead><tr><th>Студент коды</th><th>Т.А.Ә.</th><th>Пән</th><th></th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.student_code}</td>
              <td>{r.student_name}</td>
              <td>{r.course_code}</td>
              <td><button className="danger" onClick={() => remove(r.id)}>Жою</button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af' }}>Өтініштер жоқ</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
