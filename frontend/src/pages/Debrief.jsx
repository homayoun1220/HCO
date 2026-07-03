import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { completeSession } from '../api'
import { clearSession } from '../sessionStorage'
import { useT } from '../i18n/LanguageContext'
import LanguageBar from '../components/LanguageBar'

export default function Debrief({
  sessionId,
  score,
  setScore,
  setCompletionCode,
  completionCode,
  setSessionId,
  setParticipantId,
  setBlockOrder,
}) {
  const t = useT()

  useEffect(() => {
    if (sessionId && !completionCode) {
      completeSession(sessionId)
        .then(({ data }) => {
          setCompletionCode(data.completion_code)
          if (data.score) {
            setScore({ passed: data.score.passed, total: data.score.total })
          }
          clearSession()
          setSessionId?.(null)
          setParticipantId?.(null)
          setBlockOrder?.([])
        })
        .catch(console.error)
    }
  }, [
    sessionId,
    completionCode,
    setCompletionCode,
    setScore,
    setSessionId,
    setParticipantId,
    setBlockOrder,
  ])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <LanguageBar />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center"
        >
          <span className="text-4xl">🎉</span>
        </motion.div>

        <h1 className="text-3xl font-bold mb-4">{t('debrief.title')}</h1>
        <p className="text-gray-400 text-lg mb-8">{t('debrief.desc')}</p>

        {score && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl border border-[#2a2a38] p-6 mb-8"
          >
            <p className="text-gray-400 text-sm mb-2">{t('debrief.yourScore')}</p>
            <p className="text-4xl font-bold text-accent">
              {score.passed}<span className="text-gray-500 text-2xl">/{score.total}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">{t('debrief.challengesPassed')}</p>
          </motion.div>
        )}

        {completionCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-xl border border-accent/30 p-6 mb-8"
          >
            <p className="text-gray-400 text-sm mb-2">{t('debrief.completionCode')}</p>
            <p className="text-xl font-mono font-bold text-accent tracking-wider">
              {completionCode}
            </p>
            <p className="text-xs text-gray-500 mt-3">{t('debrief.copyCode')}</p>
          </motion.div>
        )}

        <div className="text-sm text-gray-500 leading-relaxed">
          <p>{t('debrief.footer')}</p>
        </div>
      </motion.div>
    </div>
  )
}
