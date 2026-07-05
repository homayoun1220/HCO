import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLORS = {
  accent: '#00d4aa',
  violet: '#8b5cf6',
  grid: '#2a2a38',
  muted: '#6b7280',
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#2a2a38] bg-card p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function AdminSpeedTrials({ data }) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-[#2a2a38] bg-card p-10 text-center text-gray-500">
        Loading speed trial data…
      </div>
    )
  }

  const { rounds_total: roundsTotal, families } = data

  if (!families?.length) {
    return (
      <div className="rounded-2xl border border-[#2a2a38] bg-card p-10 text-center text-gray-500">
        No completed Speed Trial rounds yet. Run one from the study's Guide page to see data here.
      </div>
    )
  }

  const chartData = families.map((f) => ({
    family: f.family,
    'Solved / round': f.mean_solves_per_round,
  }))

  const tooltipStyle = {
    contentStyle: { background: '#1a1a24', border: '1px solid #2a2a38', borderRadius: 12 },
    labelStyle: { color: '#e8e8ef' },
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-gray-300">
        Measured human throughput (τh) saturating a 60s window with back-to-back challenges, versus the
        automated-solver baseline from the paper's Table 2 evaluation under the same Δresp deadlines.
        {' '}
        <span className="text-accent font-medium">{roundsTotal} round(s) completed</span>
      </div>

      <ChartCard title="Solved per 60s round, by family">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
            <XAxis dataKey="family" stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis allowDecimals={false} stroke={COLORS.muted} tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip {...tooltipStyle} />
            <Legend />
            <Bar dataKey="Solved / round" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="rounded-2xl border border-[#2a2a38] bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">By challenge family</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-[#2a2a38]">
                <th className="pb-3 pr-4">Family</th>
                <th className="pb-3 pr-4">Rounds</th>
                <th className="pb-3 pr-4">Solved / round</th>
                <th className="pb-3 pr-4">Accuracy</th>
                <th className="pb-3 pr-4">Mean latency</th>
                <th className="pb-3 pr-4">Measured τh</th>
                <th className="pb-3">Paper's auto τh</th>
              </tr>
            </thead>
            <tbody>
              {families.map((row) => (
                <tr key={row.family} className="border-b border-[#2a2a38]/60">
                  <td className="py-3 pr-4 capitalize">{row.family}</td>
                  <td className="py-3 pr-4">{row.rounds}</td>
                  <td className="py-3 pr-4">{row.mean_solves_per_round}</td>
                  <td className="py-3 pr-4">{Math.round(row.mean_accuracy * 100)}%</td>
                  <td className="py-3 pr-4">{row.mean_latency}s</td>
                  <td className="py-3 pr-4 text-accent font-semibold">{row.measured_tau_h}</td>
                  <td className="py-3 text-gray-400">
                    {row.paper_baseline ? row.paper_baseline.auto_tau_h : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
