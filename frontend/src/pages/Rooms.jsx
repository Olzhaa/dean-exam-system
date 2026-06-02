import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from '../components/Icon.jsx'

export default function Rooms() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ room_number: '', capacity: 30 })
  const [err, setErr] = useState('')

  async function load() { try { setList(await api.listRooms()) } catch (e) { setErr(e.message) } }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault(); setErr('')
    try {
      await api.createRoom({ room_number: form.room_number, capacity: +form.capacity })
      setForm({ room_number: '', capacity: 30 })
      load()
    } catch (e) { setErr(e.message) }
  }

  async function remove(id) {
    if (!confirm('Жоюды растайсыз ба?')) return
    await api.deleteRoom(id); load()
  }

  return (
    <div>
      <h1 className="page-title">Кабинеттер (FX үшін)</h1>
      <div className="card">
        <form onSubmit={add}>
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <label>Кабинет нөмірі</label>
              <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Сыйымдылық</label>
              <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div><button className="primary" type="submit">Қосу</button></div>
          </div>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <table>
        <thead><tr><th>Нөмір</th><th>Сыйымдылық</th><th></th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.room_number}</td>
              <td>{r.capacity}</td>
              <td><button className="danger" onClick={() => remove(r.id)} title="Жою"><Icon name="trash" size={14} /></button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', color: '#9ca3af' }}>Кабинеттер жоқ</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
