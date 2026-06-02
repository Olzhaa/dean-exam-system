import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'

export default function ProctorAssign() {
  const [exams, setExams] = useState([])
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [pickEmp, setPickEmp] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function loadAll() {
    try {
      const [ex, emps] = await Promise.all([api.listExams(), api.listEmployees()])
      setExams(ex); setEmployees(emps)
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { loadAll() }, [])

  async function loadAssignments(examId) {
    setSelected(examId)
    try { setAssignments(await api.assignmentsFor(examId)) } catch (e) { setErr(e.message) }
  }

  async function runAuto(clear) {
    setMsg(''); setErr('')
    try {
      const r = await api.autoAssign(clear)
      setMsg(r.message)
      loadAll()
      if (selected) loadAssignments(selected)
    } catch (e) { setErr(e.message) }
  }

  async function addManual() {
    if (!selected || !pickEmp) return
    setErr('')
    try {
      await api.manualAssign(selected, +pickEmp)
      setPickEmp('')
      loadAssignments(selected); loadAll()
    } catch (e) { setErr(e.message) }
  }

  async function removeAssignment(id) {
    await api.removeAssignment(id)
    if (selected) loadAssignments(selected)
    loadAll()
  }

  return (
    <div>
      <h1 className="page-title">Проктор бөлу</h1>
      <div className="card">
        <div className="row">
          <button className="primary no-grow" onClick={() => runAuto(false)}>
            <Icon name="spark" size={14} /> Автоматты бөлу
          </button>
          <button className="no-grow" onClick={() => runAuto(true)}>
            <Icon name="refresh" size={14} /> Тазалап қайта бөлу
          </button>
        </div>
        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h3>Емтихандар</h3>
          <table>
            <thead><tr><th>Пән</th><th>Күн/Уақыт</th><th>Қажет</th></tr></thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} style={{ cursor: 'pointer', background: selected === e.id ? 'var(--primary-light)' : '' }} onClick={() => loadAssignments(e.id)}>
                  <td>{e.course_code}</td>
                  <td>{e.exam_date} {e.exam_time?.slice(0, 5)}</td>
                  <td>{e.required_proctors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3>{selected ? `Емтихан #${selected} прокторлары` : 'Емтихан таңдаңыз'}</h3>
          {selected && (
            <>
              <div className="card" style={{ padding: 12 }}>
                <div className="row">
                  <select value={pickEmp} onChange={(e) => setPickEmp(e.target.value)} style={{ flex: 2 }}>
                    <option value="">— Қызметкерді таңдаңыз —</option>
                    {employees.filter((emp) => emp.is_active).map((emp) => (
                      <option key={emp.id} value={emp.id} disabled={emp.current_proctor_count >= emp.max_proctor_count}>
                        {emp.name}{emp.department ? ` · ${emp.department}` : ''} ({emp.current_proctor_count}/{emp.max_proctor_count})
                      </option>
                    ))}
                  </select>
                  <button className="primary" onClick={addManual} disabled={!pickEmp}>Қосу</button>
                </div>
              </div>
              <table>
                <thead><tr><th>Қызметкер</th><th>Кабинет</th><th></th></tr></thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.employee_name}</td>
                      <td>{a.room ? <span className="badge">{a.room}</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                      <td><button className="danger" onClick={() => removeAssignment(a.id)} title="Алып тастау"><Icon name="trash" size={14} /></button></td>
                    </tr>
                  ))}
                  {assignments.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: '#9ca3af' }}>Прокторлар әлі жоқ</td></tr>}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
