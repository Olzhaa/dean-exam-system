import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken, setRole, setUsername } from '../api.js'

export default function Login() {
  const nav = useNavigate()
  const [username, setU] = useState('admin')
  const [password, setP] = useState('admin123')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await api.login(username, password)
      setToken(data.access_token)
      setRole(data.role)
      setUsername(data.username)
      nav('/')
      window.location.reload()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Деканат жүйесі</h1>
        <p>Емтихан және прокторингті басқару</p>
        <div className="field">
          <label>Логин</label>
          <input value={username} onChange={(e) => setU(e.target.value)} required />
        </div>
        <div className="field">
          <label>Құпиясөз</label>
          <input type="password" value={password} onChange={(e) => setP(e.target.value)} required />
        </div>
        <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Кіруде...' : 'Кіру'}
        </button>
        {err && <div className="error">{err}</div>}
        <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
          Бастапқы: admin / admin123
        </p>
      </form>
    </div>
  )
}
