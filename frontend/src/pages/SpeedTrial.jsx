import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { issueChallenge, submitChallenge, startSession, completeSession } from '../api'
import { isChallengeDataReady } from '../challengeUtils'
import { isStudyEligible } from '../sessionStorage'
import Timer from '../components/Timer'
import Perceptual from '../components/Perceptual'
import Reasoning from '../components/Reasoning'
import ChallengeErrorBoundary from '../components/ChallengeErrorBoundary'
import { useT } from '../i18n/LanguageContext'

const ROUND_SECONDS = 60

const SPEED_FAMILIES = [
  { key: 'perceptual', icon: '👁️', ring: 'ring-violet-500/25', bg: 'bg-violet-500/8' },
  { key: 'reasoning', icon: '🔢', ring: 'ring-sky-500/25', bg: 'bg-sky-500/8' },
]

// Automated-solver baseline from hco.tex Table 2, same delta_resp deadlines used here.
const PAPER_BASELINE = {
  perceptual: { autoMeanLatency: 18.4, deltaResp: 8.0 },
  reasoning: { autoMeanLatency: 22.1, deltaResp: 12.0 },
}

function ChallengeSpinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full"
      />
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

export default function SpeedTrial() {
  const navigate = useNavigate()
  const t = useT()

  const [phase, setPhase] = useState('select')
  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [challengeData, setChallengeData] = useState(null)
  const [deltaResp, setDeltaResp] = useState(8)
  const [timerRunning, setTimerRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [roundRemaining, setRoundRemaining] = useState(ROUND_SECONDS)
  const [solvedCount, setSolvedCount] = useState(0)
  const [attemptedCount, setAttemptedCount] = useState(0)
  const [summary, setSummary] = useState(null)

  const phaseRef = useRef('select')
  const familyRef = useRef(null)
  const sessionIdRef = useRef(null)
  const challengeIdRef = useRef(null)
  const trialIndexRef = useRef(0)
  const roundEndRef = useRef(null)
  const deltaRespRef = useRef(8)
  const submittingRef = useRef(false)
  const loadRequestRef = useRef(0)
  const resultsRef = useRef([])

  useEffect(() => {
    if (!isStudyEligible()) {
      navigate('/guide', { replace: true })
    }
  }, [navigate])

  const finalizeRound = useCallback(() => {
    if (phaseRef.current !== 'running') return
    phaseRef.current = 'summary'
    loadRequestRef.current += 1
    setTimerRunning(false)
    setPhase('summary')

    const results = resultsRef.current
    const attempted = results.length
    const solved = results.filter((r) => r.passed).length
    const passedLatencies = results.filter((r) => r.passed).map((r) => r.latency)
    const meanLatency = passedLatencies.length
      ? passedLatencies.reduce((a, b) => a + b, 0) / passedLatencies.length
      : 0
    const dResp = deltaRespRef.current
    const measuredTauH = meanLatency > 0 ? Math.floor(dResp / meanLatency) : 0
    const baseline = PAPER_BASELINE[familyRef.current]
    const autoTauH = baseline ? Math.floor(baseline.deltaResp / baseline.autoMeanLatency) : 0

    setSummary({
      family: familyRef.current,
      attempted,
      solved,
      accuracy: attempted ? solved / attempted : 0,
      meanLatency,
      measuredTauH,
      deltaResp: dResp,
      baseline,
      autoTauH,
    })

    if (sessionIdRef.current) {
      completeSession(sessionIdRef.current).catch(() => {})
    }
  }, [])

  const loadNextChallenge = useCallback(async () => {
    if (phaseRef.current !== 'running') return
    if (performance.now() >= roundEndRef.current) {
      finalizeRound()
      return
    }

    const requestId = ++loadRequestRef.current
    setLoading(true)
    setLoadError(null)
    setTimerRunning(false)
    setFeedback(null)
    setChallengeData(null)
    challengeIdRef.current = null

    try {
      const { data } = await issueChallenge(sessionIdRef.current, familyRef.current, trialIndexRef.current)
      if (requestId !== loadRequestRef.current || phaseRef.current !== 'running') return
      if (!isChallengeDataReady(familyRef.current, data.challenge_data)) {
        throw new Error('Incomplete challenge data from server')
      }
      challengeIdRef.current = data.challenge_id
      setChallengeData(data.challenge_data)
      const dResp = data.delta_resp ?? data.challenge_data.delta_resp ?? 10
      setDeltaResp(dResp)
      deltaRespRef.current = dResp
      setLoading(false)
      setTimerRunning(true)
    } catch (err) {
      if (requestId !== loadRequestRef.current || phaseRef.current !== 'running') return
      console.error('Failed to issue speed trial challenge', err)
      setLoadError(t('speedTrial.loadError'))
      setLoading(false)
    }
  }, [t, finalizeRound])

  const handleSubmit = useCallback(async (response) => {
    if (submittingRef.current || !challengeIdRef.current || !sessionIdRef.current || phaseRef.current !== 'running') {
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setTimerRunning(false)
    const cid = challengeIdRef.current
    const tIndex = trialIndexRef.current

    const advance = () => {
      trialIndexRef.current = tIndex + 1
      if (phaseRef.current !== 'running') return
      if (performance.now() >= roundEndRef.current) {
        finalizeRound()
      } else {
        loadNextChallenge()
      }
    }

    try {
      const { data } = await submitChallenge(sessionIdRef.current, cid, response)
      resultsRef.current.push({
        passed: data.passed,
        correct: data.correct,
        latency: data.latency,
        timeout: data.latency_fail,
      })
      setAttemptedCount((n) => n + 1)
      if (data.passed) setSolvedCount((n) => n + 1)
      setFeedback(data.passed ? 'pass' : 'fail')

      setTimeout(() => {
        setFeedback(null)
        submittingRef.current = false
        setSubmitting(false)
        advance()
      }, 350)
    } catch (err) {
      console.error('Speed trial submit failed', err)
      submittingRef.current = false
      setSubmitting(false)
      advance()
    }
  }, [loadNextChallenge, finalizeRound])

  const handleExpire = useCallback(() => {
    if (submittingRef.current || phaseRef.current !== 'running') return
    handleSubmit(familyRef.current === 'perceptual' ? { selected_index: -1 } : { answer: '' })
  }, [handleSubmit])

  const startRound = useCallback(async (fam) => {
    familyRef.current = fam
    setFamily(fam)
    setLoadError(null)
    setSolvedCount(0)
    setAttemptedCount(0)
    setSummary(null)
    resultsRef.current = []
    trialIndexRef.current = 0
    // Set before flipping phase: the round-ticker effect starts as soon as phase
    // becomes 'running' and reads this ref immediately, before startSession resolves.
    roundEndRef.current = performance.now() + ROUND_SECONDS * 1000
    setRoundRemaining(ROUND_SECONDS)
    phaseRef.current = 'running'
    setPhase('running')

    try {
      const { data } = await startSession('', '', { mode: 'speed_trial', family: fam })
      sessionIdRef.current = data.session_id
      await loadNextChallenge()
    } catch (err) {
      console.error('Failed to start speed trial session', err)
      phaseRef.current = 'select'
      setPhase('select')
      setLoadError(t('speedTrial.startError'))
    }
  }, [loadNextChallenge, t])

  // Round-level 60s wall clock, independent of the per-item Timer.
  useEffect(() => {
    if (phase !== 'running') return undefined
    let frame
    const tick = () => {
      const remaining = Math.max(0, (roundEndRef.current - performance.now()) / 1000)
      setRoundRemaining(remaining)
      if (remaining <= 0) {
        finalizeRound()
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, finalizeRound])

  const challengeReady = !loading && !loadError && isChallengeDataReady(family, challengeData)
  const roundFraction = roundRemaining / ROUND_SECONDS
  let roundColor = '#00d4aa'
  if (roundRemaining <= 15) roundColor = '#ffaa00'
  if (roundRemaining <= 5) roundColor = '#ff4444'

  if (phase === 'select') {
    return (
      <div className="min-h-screen px-4 py-10 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 mb-4"
          >
            {t('speedTrial.badge')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
          >
            {t('speedTrial.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg leading-relaxed mb-10"
          >
            {t('speedTrial.subtitle')}
          </motion.p>

          {loadError && <p className="text-danger text-sm mb-6">{loadError}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SPEED_FAMILIES.map(({ key, icon, ring, bg }, idx) => (
              <motion.button
                key={key}
                type="button"
                onClick={() => startRound(key)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.06 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`text-left rounded-2xl ring-1 ${ring} ${bg} bg-card/40 backdrop-blur-sm p-6 hover:ring-white/30 transition-colors`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-3xl leading-none select-none opacity-90" role="img" aria-hidden>
                    {icon}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-md shrink-0">
                    {t(`guide.time.${key}`)}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1">{t(`families.${key}`)}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{t(`guide.desc.${key}`)}</p>
              </motion.button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/guide')}
            className="mt-8 text-sm text-gray-500 hover:text-white transition-colors"
          >
            {t('speedTrial.backToGuide')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'summary' && summary) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center"
        >
          <h1 className="text-3xl font-bold mb-2">{t('speedTrial.summaryTitle')}</h1>
          <p className="text-gray-400 mb-8">{t(`families.${summary.family}`)}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t('speedTrial.solvesPerMin')}
              </p>
              <p className="text-3xl font-bold text-accent">{summary.solved}</p>
            </div>
            <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t('speedTrial.accuracy')}
              </p>
              <p className="text-3xl font-bold">{Math.round(summary.accuracy * 100)}%</p>
            </div>
            <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t('speedTrial.meanLatency')}
              </p>
              <p className="text-3xl font-bold">{summary.meanLatency.toFixed(1)}s</p>
            </div>
            <div className="rounded-2xl border border-[#2a2a38] bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                {t('speedTrial.measuredThroughput')}
              </p>
              <p className="text-3xl font-bold">{summary.measuredTauH}</p>
            </div>
          </div>

          {summary.baseline && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-gray-300 mb-8 text-left">
              {t('speedTrial.comparison', {
                autoLatency: summary.baseline.autoMeanLatency.toFixed(1),
                deltaResp: summary.deltaResp,
                autoTauH: summary.autoTauH,
                tauH: summary.measuredTauH,
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              type="button"
              onClick={() => setPhase('select')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 rounded-xl bg-accent text-background font-semibold"
            >
              {t('speedTrial.runAgain')}
            </motion.button>
            <button
              type="button"
              onClick={() => navigate('/guide')}
              className="px-8 py-3.5 rounded-xl ring-1 ring-white/15 text-gray-300 font-medium hover:ring-white/30 hover:text-white transition-colors"
            >
              {t('speedTrial.backToGuide')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 md:px-8">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 gap-6">
        <div className="rounded-2xl border border-[#2a2a38] bg-card p-4">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-gray-300 font-medium">{t(`families.${family}`)}</span>
            <span className="text-gray-400">
              {t('speedTrial.solved')} <span className="text-accent font-semibold">{solvedCount}</span>
              {' · '}
              {t('speedTrial.attempted')} <span className="font-semibold">{attemptedCount}</span>
            </span>
            <span className="tabular-nums font-mono" style={{ color: roundColor }}>
              {Math.ceil(roundRemaining)}s
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#2a2a38] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: roundColor }}
              animate={{ width: `${roundFraction * 100}%` }}
              transition={{ duration: 0.2, ease: 'linear' }}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Timer deltaResp={deltaResp} onExpire={handleExpire} isRunning={timerRunning && challengeReady} />
        </div>

        <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
          {!challengeReady ? (
            loadError ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-danger">{loadError}</p>
                <motion.button
                  type="button"
                  onClick={() => loadNextChallenge()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl bg-accent text-background font-semibold"
                >
                  {t('study.retry')}
                </motion.button>
              </div>
            ) : (
              <ChallengeSpinner label={t('study.loadingChallenge')} />
            )
          ) : (
            <ChallengeErrorBoundary resetKey={`${trialIndexRef.current}-${family}`}>
              {family === 'perceptual' ? (
                <Perceptual
                  challengeData={challengeData}
                  onSubmit={handleSubmit}
                  disabled={submitting || !!feedback}
                />
              ) : (
                <Reasoning
                  challengeData={challengeData}
                  onSubmit={handleSubmit}
                  disabled={submitting || !!feedback}
                />
              )}
            </ChallengeErrorBoundary>
          )}

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 pointer-events-none"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-7xl ${feedback === 'pass' ? 'text-accent' : 'text-danger'}`}
                >
                  {feedback === 'pass' ? '✓' : '✗'}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
