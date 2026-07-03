import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { issueChallenge, submitChallenge, startSession } from '../api'
import { isChallengeDataReady } from '../challengeUtils'
import Timer from '../components/Timer'
import ProgressBar from '../components/ProgressBar'
import Perceptual from '../components/Perceptual'
import Reasoning from '../components/Reasoning'
import Attention from '../components/Attention'
import Biometric from '../components/Biometric'
import ChallengeErrorBoundary from '../components/ChallengeErrorBoundary'
import { clearSession, isStudyEligible, loadSession, saveSession } from '../sessionStorage'
import { useT } from '../i18n/LanguageContext'

const TRIALS_PER_FAMILY = 5
const TOTAL_TRIALS = 20

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

export default function Study({
  sessionId,
  setSessionId,
  participantId,
  setParticipantId,
  blockOrder,
  setBlockOrder,
  prolificPid,
  studyId,
  setScore,
}) {
  const navigate = useNavigate()
  const t = useT()
  const [trialNum, setTrialNum] = useState(1)
  const [sessionReady, setSessionReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [challengeId, setChallengeId] = useState(null)
  const [challengeData, setChallengeData] = useState(null)
  const [deltaResp, setDeltaResp] = useState(10)
  const [timerRunning, setTimerRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const passedCountRef = useRef(0)
  const challengeIdRef = useRef(null)
  const submittingRef = useRef(false)
  const loadRequestRef = useRef(0)
  const sessionRecoveryRef = useRef(false)

  const familyIndex = Math.floor((trialNum - 1) / TRIALS_PER_FAMILY)
  const trialInFamily = (trialNum - 1) % TRIALS_PER_FAMILY
  const currentFamily = blockOrder[familyIndex]

  const createSession = useCallback(async () => {
    const { data } = await startSession(prolificPid, studyId)
    const session = {
      session_id: data.session_id,
      participant_id: data.participant_id,
      block_order: data.block_order,
    }
    saveSession(session)
    setSessionId(data.session_id)
    setParticipantId(data.participant_id)
    setBlockOrder(data.block_order)
    sessionRecoveryRef.current = false
    return data.session_id
  }, [prolificPid, studyId, setSessionId, setParticipantId, setBlockOrder])

  // Restore or create session before issuing challenges
  useEffect(() => {
    let cancelled = false

    const initSession = async () => {
      if (sessionId && blockOrder.length > 0) {
        setSessionReady(true)
        return
      }

      const stored = loadSession()
      if (stored?.session_id && stored?.block_order?.length) {
        setSessionId(stored.session_id)
        setParticipantId(stored.participant_id)
        setBlockOrder(stored.block_order)
        setSessionReady(true)
        return
      }

      if (!isStudyEligible()) {
        navigate('/guide', { replace: true })
        return
      }

      try {
        if (cancelled) return
        await createSession()
        if (cancelled) return
        setSessionReady(true)
      } catch (err) {
        console.error('Failed to start session', err)
        if (!cancelled) navigate('/', { replace: true })
      }
    }

    initSession()
    return () => { cancelled = true }
  }, [
    sessionId,
    blockOrder.length,
    prolificPid,
    studyId,
    navigate,
    setSessionId,
    setParticipantId,
    setBlockOrder,
    createSession,
  ])

  const applyChallengeResponse = useCallback((requestId, family, data) => {
    if (requestId !== loadRequestRef.current) return false

    const nextData = data.challenge_data
    if (!isChallengeDataReady(family, nextData)) {
      throw new Error('Incomplete challenge data from server')
    }

    setChallengeId(data.challenge_id)
    challengeIdRef.current = data.challenge_id
    setChallengeData(nextData)
    setDeltaResp(data.delta_resp ?? nextData.delta_resp ?? 10)
    setLoading(false)
    setTimerRunning(true)
    return true
  }, [])

  const loadChallenge = useCallback(async (sid, family, tIndex) => {
    const requestId = ++loadRequestRef.current

    setLoading(true)
    setLoadError(null)
    setTimerRunning(false)
    setFeedback(null)
    setChallengeData(null)
    setChallengeId(null)
    challengeIdRef.current = null

    try {
      const { data } = await issueChallenge(sid, family, tIndex)
      applyChallengeResponse(requestId, family, data)
    } catch (err) {
      if (requestId !== loadRequestRef.current) return

      const status = err?.response?.status
      const staleSession = status === 404 || status === 409

      if (staleSession && !sessionRecoveryRef.current && isStudyEligible()) {
        sessionRecoveryRef.current = true
        clearSession()
        try {
          const newSid = await createSession()
          const { data } = await issueChallenge(newSid, family, tIndex)
          applyChallengeResponse(requestId, family, data)
          return
        } catch (retryErr) {
          console.error('Failed to recover stale session', retryErr)
        }
      }

      console.error('Failed to issue challenge', err)
      setLoadError(t('study.loadError'))
      setLoading(false)
    }
  }, [applyChallengeResponse, createSession, t])

  const handleRetryLoad = useCallback(async () => {
    if (!currentFamily) return

    sessionRecoveryRef.current = false
    clearSession()
    setSessionReady(false)

    try {
      const sid = await createSession()
      setSessionReady(true)
      await loadChallenge(sid, currentFamily, trialInFamily)
    } catch (err) {
      console.error('Failed to restart session', err)
      setLoadError(t('study.loadError'))
      setLoading(false)
    }
  }, [clearSession, createSession, currentFamily, trialInFamily, loadChallenge, t])

  useEffect(() => {
    if (!sessionReady || !sessionId || !currentFamily) return
    loadChallenge(sessionId, currentFamily, trialInFamily)
  }, [sessionReady, sessionId, currentFamily, trialInFamily, trialNum, loadChallenge])

  const handleSubmit = useCallback(async (response) => {
    if (submittingRef.current || !challengeIdRef.current || !sessionId) return false
    submittingRef.current = true
    setSubmitting(true)
    setTimerRunning(false)

    try {
      const { data } = await submitChallenge(sessionId, challengeIdRef.current, response)
      if (data.passed) {
        passedCountRef.current += 1
      }
      setFeedback(data.passed ? 'pass' : 'fail')

      setTimeout(() => {
        setFeedback(null)
        submittingRef.current = false
        setSubmitting(false)

        if (trialNum >= TOTAL_TRIALS) {
          setScore({ passed: passedCountRef.current, total: TOTAL_TRIALS })
          navigate('/debrief')
        } else {
          setTrialNum((n) => n + 1)
        }
      }, 800)
      return true
    } catch (err) {
      console.error('Submit failed', err)
      submittingRef.current = false
      setSubmitting(false)
      return false
    }
  }, [sessionId, trialNum, navigate, setScore])

  const handleExpire = useCallback(() => {
    if (submittingRef.current) return

    if (currentFamily === 'biometric' && window.__biometricExpire) {
      window.__biometricExpire()
      return
    }

    handleSubmit(
      currentFamily === 'perceptual' ? { selected_index: -1 }
        : currentFamily === 'reasoning' ? { answer: '' }
          : currentFamily === 'attention' ? { click: { x: -999, y: -999 } }
            : { audio_b64: '' },
    )
  }, [currentFamily, handleSubmit])

  const challengeReady = !loading
    && !loadError
    && isChallengeDataReady(currentFamily, challengeData)

  const renderChallenge = () => {
    if (!challengeReady) return null

    const props = {
      challengeData,
      onSubmit: handleSubmit,
      disabled: submitting || !!feedback,
      onExpire: handleExpire,
    }

    const component = (() => {
      switch (currentFamily) {
        case 'perceptual':
          return <Perceptual {...props} />
        case 'reasoning':
          return <Reasoning {...props} />
        case 'attention':
          return <Attention {...props} />
        case 'biometric':
          return <Biometric {...props} />
        default:
          return null
      }
    })()

    return (
      <ChallengeErrorBoundary resetKey={`${trialNum}-${currentFamily}`}>
        {component}
      </ChallengeErrorBoundary>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChallengeSpinner label={t('study.startingSession')} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 md:px-8">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 gap-6">
        <ProgressBar
          current={trialNum}
          total={TOTAL_TRIALS}
          familyKey={currentFamily}
          familyIndex={familyIndex}
        />

        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-300">
            {currentFamily ? t(`families.${currentFamily}`) : t('study.loading')}
          </h2>
        </div>

        <div className="flex justify-center">
          <Timer
            deltaResp={deltaResp}
            onExpire={handleExpire}
            isRunning={timerRunning && challengeReady}
          />
        </div>

        <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
          {!challengeReady ? (
            loadError ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-danger">{loadError}</p>
                <motion.button
                  type="button"
                  onClick={handleRetryLoad}
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
            renderChallenge()
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
