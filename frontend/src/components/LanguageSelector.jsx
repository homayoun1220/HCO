import { motion } from 'framer-motion'
import { LANGUAGES, useLanguage } from '../i18n/LanguageContext'

function LanguageFlag({ flagSrc, label, className }) {
  return (
    <img
      src={flagSrc}
      alt=""
      aria-hidden
      draggable={false}
      className={`object-cover rounded-md shadow-sm ${className}`}
    />
  )
}

export default function LanguageSelector({ prominent = false, onSelect }) {
  const { lang, setLang } = useLanguage()

  const pick = (code) => {
    setLang(code)
    onSelect?.(code)
  }

  if (prominent) {
    return (
      <div className="w-full max-w-3xl mx-auto text-center">
        <span className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-accent/10 border border-accent/30 text-3xl" role="img" aria-hidden>
          🌐
        </span>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-3">
          Choose your language
        </h2>
        <p className="text-gray-400 text-lg md:text-xl mb-2">Elige tu idioma</p>
        <p className="text-gray-500 text-sm md:text-base mb-8 md:mb-12">Select a language to continue</p>

        <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-2xl mx-auto">
          {Object.values(LANGUAGES).map(({ code, label, flagSrc }) => (
            <motion.button
              key={code}
              type="button"
              onClick={() => pick(code)}
              whileHover={{ scale: 1.04, y: -6 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center justify-center gap-4 py-10 md:py-14 px-4 rounded-3xl border-2 border-[#2a2a38] bg-card hover:border-accent/50 hover:bg-accent/5 transition-colors min-h-[200px] sm:min-h-[280px] md:min-h-[320px]"
            >
              <LanguageFlag
                flagSrc={flagSrc}
                label={label}
                className="w-[clamp(5rem,22vw,9rem)] h-[clamp(3.5rem,15vw,6rem)] border border-white/10"
              />
              <span className="text-xl md:text-3xl font-bold text-white">
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {Object.values(LANGUAGES).map(({ code, flagSrc, label }) => (
        <motion.button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          title={label}
          aria-label={label}
          className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 transition-all overflow-hidden ${
            lang === code
              ? 'border-accent bg-accent/20 shadow-lg shadow-accent/20'
              : 'border-[#2a2a38] bg-card/80 hover:border-accent/40'
          }`}
        >
          <LanguageFlag flagSrc={flagSrc} label={label} className="w-full h-full rounded-none" />
        </motion.button>
      ))}
    </div>
  )
}
