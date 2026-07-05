import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useT } from '../i18n/LanguageContext'
import LanguageBar from '../components/LanguageBar'
import { markStudyEligible } from '../sessionStorage'

const CHALLENGE_TYPES = [
  { key: 'perceptual', icon: '👁️', ring: 'ring-violet-500/25', bg: 'bg-violet-500/8' },
  { key: 'reasoning', icon: '🔢', ring: 'ring-sky-500/25', bg: 'bg-sky-500/8' },
  { key: 'attention', icon: '🎯', ring: 'ring-amber-500/25', bg: 'bg-amber-500/8' },
  { key: 'biometric', icon: '🎤', ring: 'ring-rose-500/25', bg: 'bg-rose-500/8' },
]

const TIPS = ['timer', 'microphone', 'focus', 'optional']

export default function Guide() {
  const navigate = useNavigate()
  const t = useT()

  const startStudy = () => {
    markStudyEligible()
    navigate('/study')
  }

  return (
    <div className="min-h-screen px-4 py-10 md:px-8">
      <LanguageBar />

      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 mb-4">
            {t('guide.badge')}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            {t('guide.title')}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto">
            {t('guide.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10"
        >
          {CHALLENGE_TYPES.map(({ key, icon, ring, bg }, idx) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.06 }}
              className={`rounded-2xl ring-1 ${ring} ${bg} bg-card/40 backdrop-blur-sm p-5 md:p-6`}
            >
              <div className="flex items-start gap-4">
                <span
                  className="text-3xl leading-none select-none opacity-90"
                  role="img"
                  aria-hidden
                >
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white">{t(`families.${key}`)}</h3>
                    <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-md shrink-0">
                      {t(`guide.time.${key}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {t(`guide.desc.${key}`)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl ring-1 ring-white/8 bg-card/50 p-6 md:p-8 mb-10"
        >
          <h2 className="text-base font-semibold mb-4 text-gray-200">
            {t('guide.tipsTitle')}
          </h2>
          <ul className="space-y-3">
            {TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-gray-400 text-sm leading-relaxed">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-gray-500 shrink-0" />
                <span>{t(`guide.tips.${tip}`)}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
        >
          <motion.button
            type="button"
            onClick={startStudy}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 sm:flex-none px-10 py-3.5 rounded-xl bg-white text-background font-semibold text-base shadow-lg shadow-black/20 hover:bg-gray-100 transition-colors"
          >
            {t('guide.startStudy')}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => navigate('/practice')}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex-1 sm:flex-none px-10 py-3.5 rounded-xl ring-1 ring-white/15 text-gray-300 font-medium hover:ring-white/30 hover:text-white transition-colors"
          >
            {t('guide.tryDemo')}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => {
              markStudyEligible()
              navigate('/speed-trial')
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex-1 sm:flex-none px-10 py-3.5 rounded-xl ring-1 ring-white/15 text-gray-300 font-medium hover:ring-white/30 hover:text-white transition-colors"
          >
            {t('guide.speedTrial')}
          </motion.button>
        </motion.div>

        <p className="text-center text-xs text-gray-600 mt-6">{t('guide.demoNote')}</p>
      </div>
    </div>
  )
}
