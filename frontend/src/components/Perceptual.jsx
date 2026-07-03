import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useT } from '../i18n/LanguageContext'

export default function Perceptual({ challengeData, onSubmit, disabled }) {
  const t = useT()
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setSelected(null)
  }, [challengeData])

  if (!challengeData?.options?.length || !challengeData?.original_b64) {
    return (
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full"
        />
        <p className="text-sm text-gray-400">{t('perceptual.loading')}</p>
      </div>
    )
  }

  const handleSelect = (idx) => {
    if (disabled) return
    setSelected(idx)
    onSubmit({ selected_index: idx })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center justify-center w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-gray-400 uppercase tracking-wider">{t('perceptual.original')}</p>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl overflow-hidden border-2 border-accent/30 shadow-lg shadow-accent/10"
        >
          <img
            src={`data:image/png;base64,${challengeData.original_b64}`}
            alt={t('perceptual.original')}
            className="w-48 h-48 object-contain bg-[#12121a]"
          />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-3 flex-1">
        <p className="text-sm text-gray-400 uppercase tracking-wider">{t('perceptual.selectMatch')}</p>
        <div className="grid grid-cols-2 gap-4">
          {challengeData.options.map((opt, idx) => (
            <motion.button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(idx)}
              whileHover={{ scale: disabled ? 1 : 1.03 }}
              whileTap={{ scale: disabled ? 1 : 0.97 }}
              className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                selected === idx
                  ? 'border-accent shadow-lg shadow-accent/20 ring-2 ring-accent/30'
                  : 'border-[#2a2a38] hover:border-accent/50'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <img
                src={`data:image/png;base64,${opt}`}
                alt={t('perceptual.option', { n: idx + 1 })}
                className="w-36 h-36 object-contain bg-[#12121a]"
              />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
