import { useState } from 'react'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'

export default function StudentLookup() {
  const [code, setCode] = useState('')
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [searched, setSearched] = useState(false)

  async function search(e) {
    e.preventDefault()
    setErr(''); setData(null); setSearched(false)
    try {
      const r = await api.studentSchedule(code.trim())
      setData(r); setSearched(true)
    } catch (ex) { setErr(ex.message) }
  }

  return (
    <div>
      <h1 className="page-title">Студент кестесін іздеу</h1>
      <div className="card">
        <form onSubmit={search}>
          <div className="row">
            <div className="field" style={{ flex: 3 }}>
              <label>Студент коды</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Мысалы: 220103045" required />
            </div>
            <div className="no-grow"><button className="primary" type="submit"><Icon name="search" size={14} /> Іздеу</button></div>
          </div>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      {searched && !data && <div className="card">Студент табылмады немесе FX өтініші жоқ.</div>}

      {data && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{data.student_name} <span className="badge">{data.student_code}</span></h3>
          {data.items.length === 0 ? (
            <p>FX емтихандары әлі жоспарланбаған.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Күн</th><th>Уақыт</th><th>Пән</th><th>Кабинет</th><th>Ұзақтығы</th></tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.exam_date}</td>
                    <td>{it.exam_time?.slice(0, 5)}</td>
                    <td><b>{it.course_code}</b></td>
                    <td>{it.room_number || '—'}</td>
                    <td>{it.duration} мин</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
