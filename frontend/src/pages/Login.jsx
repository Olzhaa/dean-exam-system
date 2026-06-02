import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken, setRole, setUsername } from '../api.js'
import Icon from '../components/Icon.jsx'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'var(--primary-light)', padding: 8, borderRadius: 8, color: 'var(--primary)' }}>
            <Icon name="clipboard" size={24} />
          </div>
          <h1 style={{ margin: 0 }}>Деканат жүйесі</h1>
        </div>
        <p>Емтихан және прокторингті басқару</p>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="login-username">Логин</label>
          <input id="login-username" value={username} onChange={(e) => setU(e.target.value)} required autoComplete="username" />
        </div>
        <div className="field" style={{ marginBottom: 18 }}>
          <label htmlFor="login-password">Құпиясөз</label>
          <input id="login-password" type="password" value={password} onChange={(e) => setP(e.target.value)} required autoComplete="current-password" />
        </div>
        <button className="primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <><span className="spinner" /> Кіруде...</> : 'Кіру'}
        </button>
        {err && <div className="error">{err}</div>}
        <p className="muted text-center" style={{ marginTop: 18, fontSize: 12 }}>
          Бастапқы: <code className="mono">admin / admin123</code>
        </p>
      </form>
    </div>
  )
}
