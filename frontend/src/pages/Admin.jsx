import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  adminLogin,
  clearAdminToken,
  downloadAdminExport,
  fetchAdminAnalytics,
  fetchAdminHealth,
  fetchAdminSessions,
  fetchAdminStats,
  fetchPublicHealth,
  getAdminToken,
} from '../adminApi'
import AdminAnalytics from '../components/AdminAnalytics'

const REFRESH_MS = 15000
const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'sessions', label: 'Sessions' },
]

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-accent' : 'text-white'}`}>{value}</p>
      {hint && <p className="text-sm text-gray-500 mt-2">{hint}</p>}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    clean: 'bg-accent/15 text-accent border-accent/30',
    in_progress: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    completed_incomplete: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    started: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  }
  return (
    <span className={`inline-flex px-2 py-1 rounded-lg border text-xs font-medium ${styles[status] || styles.started}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await adminLogin(password)
      onSuccess()
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      if (status === 503) {
        setError('Admin is not configured. Set HCO_ADMIN_PASSWORD on the backend and restart.')
      } else if (status === 401) {
        setError('Wrong password.')
      } else {
        setError(detail || 'Could not reach admin API.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-[#2a2a38] bg-card p-8"
      >
        <h1 className="text-2xl font-bold mb-2">HCO Admin</h1>
        <p className="text-gray-400 text-sm mb-6">Study dashboard — export and live stats</p>
        <label className="block text-sm text-gray-400 mb-2" htmlFor="admin-password">
          Admin password
        </label>
        <div className="relative mb-3">
          <input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#2a2a38] bg-background px-4 py-3 focus:outline-none focus:border-accent/50"
            autoComplete="current-password"
          />
        </div>
        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none text-sm text-gray-400">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="rounded border-[#2a2a38] bg-background text-accent focus:ring-accent/30"
          />
          Show password
        </label>
        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-xl bg-accent text-background font-semibold py-3 disabled:opacity-40"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </motion.form>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!getAdminToken())
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsFilter, setSessionsFilter] = useState('clean')
  const [health, setHealth] = useState(null)
  const [publicHealth, setPublicHealth] = useState(null)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadDashboard = useCallback(async () => {
    try {
      const requests = [
        fetchAdminStats(),
        fetchAdminSessions(),
        fetchAdminHealth(),
        fetchPublicHealth(),
      ]
      if (tab === 'analytics') {
        requests.push(fetchAdminAnalytics())
      }
      const results = await Promise.all(requests)
      setStats(results[0])
      setSessions(results[1])
      setHealth(results[2])
      setPublicHealth(results[3])
      if (tab === 'analytics' && results[4]) {
        setAnalytics(results[4])
      }
      setError('')
      setLastRefresh(new Date())
    } catch (err) {
      if (err?.response?.status === 401) {
        clearAdminToken()
        setAuthed(false)
      } else {
        setError('Failed to load dashboard data.')
      }
    }
  }, [tab])

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await fetchAdminAnalytics()
      setAnalytics(data)
    } catch (err) {
      if (err?.response?.status === 401) {
        clearAdminToken()
        setAuthed(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!authed) return undefined
    loadDashboard()
    const id = setInterval(loadDashboard, REFRESH_MS)
    return () => clearInterval(id)
  }, [authed, loadDashboard])

  useEffect(() => {
    if (!authed || tab !== 'analytics') return undefined
    loadAnalytics()
    const id = setInterval(loadAnalytics, 30000)
    return () => clearInterval(id)
  }, [authed, tab, loadAnalytics])

  const handleLogout = () => {
    clearAdminToken()
    setAuthed(false)
    setStats(null)
    setSessions([])
    setAnalytics(null)
  }

  const visibleSessions = sessions.filter((row) => {
    if (sessionsFilter === 'all') return true
    return row.status === 'clean'
  })

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">HCO Admin</h1>
            <p className="text-gray-400 mt-1">
              Live study dashboard
              {lastRefresh && (
                <span className="text-gray-500">
                  {' '}
                  · updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadAdminExport(true)}
              className="px-4 py-2 rounded-xl bg-accent text-background font-semibold text-sm"
            >
              Export clean CSV
            </button>
            <button
              type="button"
              onClick={() => downloadAdminExport(false)}
              className="px-4 py-2 rounded-xl border border-[#2a2a38] bg-card text-sm hover:border-accent/40"
            >
              Export all CSV
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl border border-[#2a2a38] text-sm text-gray-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-danger text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8 border-b border-[#2a2a38] pb-4">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-accent text-background'
                  : 'text-gray-400 hover:text-white hover:bg-card'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active now"
            value={stats?.participants_active_now ?? '—'}
            hint={`Submitted a trial in the last ${stats?.active_window_minutes ?? 15} min`}
            accent
          />
          <StatCard
            label="Completed"
            value={stats?.participants_completed ?? '—'}
            hint="Reached debrief"
          />
          <StatCard
            label="Clean runs"
            value={stats?.participants_clean ?? '—'}
            hint="Completed with exactly 20 trials"
          />
          <StatCard
            label="With trial data"
            value={stats?.participants_with_trials ?? '—'}
            hint="At least one submitted trial"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Trials submitted" value={stats?.trials_submitted ?? '—'} />
          <StatCard
            label="Overall pass rate"
            value={stats ? `${Math.round(stats.overall_pass_rate * 100)}%` : '—'}
          />
          <StatCard label="In progress" value={stats?.sessions_in_progress ?? '—'} />
          <StatCard label="Total sessions" value={stats?.sessions_total ?? '—'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 rounded-2xl border border-[#2a2a38] bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">By challenge family</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-[#2a2a38]">
                    <th className="pb-3 pr-4">Family</th>
                    <th className="pb-3 pr-4">n</th>
                    <th className="pb-3 pr-4">Pass</th>
                    <th className="pb-3 pr-4">Mean lat.</th>
                    <th className="pb-3 pr-4">Lat. fail</th>
                    <th className="pb-3">Wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.by_family ?? []).map((row) => (
                    <tr key={row.family} className="border-b border-[#2a2a38]/60">
                      <td className="py-3 pr-4 capitalize">{row.family}</td>
                      <td className="py-3 pr-4">{row.n}</td>
                      <td className="py-3 pr-4">{Math.round(row.pass_rate * 100)}%</td>
                      <td className="py-3 pr-4">{row.mean_latency}s</td>
                      <td className="py-3 pr-4">{Math.round(row.latency_fail_rate * 100)}%</td>
                      <td className="py-3">{Math.round(row.correctness_fail_rate * 100)}%</td>
                    </tr>
                  ))}
                  {!stats?.by_family?.length && (
                    <tr>
                      <td colSpan={6} className="py-6 text-gray-500">No trial data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a38] bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">API status</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Public health</p>
                <p className="font-mono text-accent">
                  {publicHealth?.status ?? '—'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  GET /api/health
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Admin health</p>
                <p className="font-mono text-accent">
                  {health?.status ?? '—'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  GET /api/admin/health
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Auto refresh</p>
                <p className="text-white">{REFRESH_MS / 1000}s</p>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {tab === 'analytics' && <AdminAnalytics data={analytics} />}

        {tab === 'sessions' && (
        <div className="rounded-2xl border border-[#2a2a38] bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold">Sessions</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSessionsFilter('clean')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  sessionsFilter === 'clean' ? 'bg-accent text-background' : 'bg-background border border-[#2a2a38] text-gray-400'
                }`}
              >
                Clean only
              </button>
              <button
                type="button"
                onClick={() => setSessionsFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  sessionsFilter === 'all' ? 'bg-accent text-background' : 'bg-background border border-[#2a2a38] text-gray-400'
                }`}
              >
                All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#2a2a38]">
                  <th className="pb-3 pr-4">Started</th>
                  <th className="pb-3 pr-4">Participant</th>
                  <th className="pb-3 pr-4">Trials</th>
                  <th className="pb-3 pr-4">Passed</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Completed</th>
                </tr>
              </thead>
              <tbody>
                {visibleSessions.map((row) => (
                  <tr key={row.session_id} className="border-b border-[#2a2a38]/60">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {row.started_at?.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {row.participant_id.slice(0, 12)}…
                    </td>
                    <td className="py-3 pr-4">{row.trial_count}</td>
                    <td className="py-3 pr-4">{row.passed_count}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3">
                      {row.completed_at ? 'Yes' : '—'}
                    </td>
                  </tr>
                ))}
                {!visibleSessions.length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-gray-500">No sessions match this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
