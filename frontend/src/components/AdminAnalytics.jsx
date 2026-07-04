import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = {
  accent: '#00d4aa',
  danger: '#ff4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  grid: '#2a2a38',
  muted: '#6b7280',
}

const PIE_COLORS = [COLORS.accent, COLORS.danger, COLORS.amber]

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#2a2a38] bg-card p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function InsightCard({ insight }) {
  const styles = {
    info: 'border-accent/30 bg-accent/5 text-gray-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[insight.severity] || styles.info}`}>
      {insight.family && (
        <span className="inline-block text-xs uppercase tracking-wider text-gray-500 mb-1">
          {insight.family}
        </span>
      )}
      <p>{insight.message}</p>
    </div>
  )
}

export default function AdminAnalytics({ data }) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-[#2a2a38] bg-card p-10 text-center text-gray-500">
        Loading analytics…
      </div>
    )
  }

  const { overview, families, failure_breakdown, overall_outcomes, latency_histograms, timeline, insights } = data

  const passRateData = families.map((f) => ({
    family: f.family,
    pass: Math.round(f.pass_rate * 100),
    correct: Math.round(f.correct_rate * 100),
  }))

  const failureStackData = failure_breakdown.map((f) => ({
    family: f.family,
    Passed: f.passed,
    'Latency fail': f.latency_fail,
    'Wrong answer': f.correctness_fail,
  }))

  const pieData = [
    { name: 'Passed', value: overall_outcomes.passed },
    { name: 'Latency fail', value: overall_outcomes.latency_fail },
    { name: 'Wrong answer', value: overall_outcomes.correctness_fail },
  ].filter((d) => d.value > 0)

  const throughputData = families.map((f) => ({
    family: f.family,
    throughput: f.throughput_per_min,
  }))

  const tooltipStyle = {
    contentStyle: { background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 12 },
    labelStyle: { color: '#e8e8ef' },
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-gray-300">
        Clean data only — completed sessions with exactly {overview.trials_per_participant} submitted trials.
        {' '}
        <span className="text-accent font-medium">{overview.participants_clean} participants</span>
        {' · '}
        <span className="text-accent font-medium">{overview.trials_total} trials</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Clean participants</p>
          <p className="text-3xl font-bold text-accent">{overview.participants_clean}</p>
        </div>
        <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Overall pass rate</p>
          <p className="text-3xl font-bold">{Math.round(overview.overall_pass_rate * 100)}%</p>
        </div>
        <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Correct rate</p>
          <p className="text-3xl font-bold">{Math.round(overview.overall_correct_rate * 100)}%</p>
        </div>
        <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Total trials</p>
          <p className="text-3xl font-bold">{overview.trials_total}</p>
        </div>
      </div>

      {insights?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, idx) => (
              <InsightCard key={`${insight.family}-${idx}`} insight={insight} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pass rate by family">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={passRateData}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="family" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis unit="%" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Bar dataKey="pass" name="Pass %" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
              <Bar dataKey="correct" name="Correct %" fill={COLORS.violet} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Overall outcomes (all clean trials)">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Failure breakdown by family">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={failureStackData}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="family" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Bar dataKey="Passed" stackId="a" fill={COLORS.accent} />
              <Bar dataKey="Latency fail" stackId="a" fill={COLORS.danger} />
              <Bar dataKey="Wrong answer" stackId="a" fill={COLORS.amber} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Throughput proxy (trials/min, higher = faster)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={throughputData}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="family" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="throughput" name="1/mean_latency × 60" fill={COLORS.violet} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {timeline?.length > 0 && (
        <ChartCard title="Clean completions over time">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="completions" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Latency distribution (clean trials)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {families.map((fam) => (
            <ChartCard key={fam.family} title={`${fam.family} — median ${fam.median_latency}s, p90 ${fam.p90_latency}s`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={latency_histograms[fam.family] || []}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ))}
        </div>
      </div>
    </div>
  )
}
