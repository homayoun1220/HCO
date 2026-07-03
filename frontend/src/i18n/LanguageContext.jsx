import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en'
import es from './es'

export const LANG_STORAGE_KEY = 'hco_lang'
export const LANGUAGES = {
  en: { code: 'en', label: 'English', flagSrc: '/flags/gb.svg', translations: en },
  es: { code: 'es', label: 'Español', flagSrc: '/flags/es.svg', translations: es },
}

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function interpolate(str, vars = {}) {
  if (!str || typeof str !== 'string') return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

export function translate(lang, key, vars) {
  const pack = LANGUAGES[lang]?.translations ?? LANGUAGES.en.translations
  const value = getNested(pack, key) ?? getNested(LANGUAGES.en.translations, key) ?? key
  return interpolate(value, vars)
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    return stored === 'es' ? 'es' : stored === 'en' ? 'en' : null
  })

  const setLang = useCallback((code) => {
    localStorage.setItem(LANG_STORAGE_KEY, code)
    setLangState(code)
    document.documentElement.lang = code
  }, [])

  useEffect(() => {
    if (lang) document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key, vars) => translate(lang ?? 'en', key, vars),
    [lang],
  )

  const value = useMemo(
    () => ({ lang, setLang, t, hasSelectedLanguage: lang !== null }),
    [lang, setLang, t],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useT() {
  return useLanguage().t
}

export function familyKey(family) {
  return `families.${family}`
}
