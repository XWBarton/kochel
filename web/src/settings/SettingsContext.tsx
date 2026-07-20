import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type AccentColorName = 'rust' | 'teal' | 'mustard' | 'cobalt'
export type Theme = 'dark' | 'light'

export const ACCENT_COLORS: Record<AccentColorName, { hex: string; label: string }> = {
  rust: { hex: '#B6401F', label: 'Rust' },
  teal: { hex: '#1F6B63', label: 'Deep teal' },
  mustard: { hex: '#B98A1E', label: 'Mustard' },
  cobalt: { hex: '#33489E', label: 'Cobalt' },
}

const ACCENT_KEY = 'kochel:accentColorName'
const THEME_KEY = 'kochel:theme'
// theme used to be scoped to just the Now Playing panel — migrate an
// existing choice under the old key forward rather than silently losing it
const LEGACY_PANEL_THEME_KEY = 'kochel:panelTheme'

function isAccentColorName(value: string | null): value is AccentColorName {
  return value !== null && value in ACCENT_COLORS
}

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light'
}

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (isTheme(stored)) return stored
  const legacy = localStorage.getItem(LEGACY_PANEL_THEME_KEY)
  if (isTheme(legacy)) return legacy
  return systemTheme()
}

interface SettingsContextValue {
  accentColorName: AccentColorName
  accentColor: string
  setAccentColorName: (name: AccentColorName) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accentColorName, setAccentColorNameState] = useState<AccentColorName>(() => {
    const stored = localStorage.getItem(ACCENT_KEY)
    return isAccentColorName(stored) ? stored : 'rust'
  })
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  // the accent is consumed both by CSS (via the custom property, for every
  // hairline/link/play-triangle styled with var(--accent)) and directly in
  // JS (the Sunburst SVG's accent prop, which needs a resolved color string)
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENT_COLORS[accentColorName].hex)
  }, [accentColorName])

  // drives every themed color in tokens.css via the :root[data-theme="dark"]
  // override block, so this is a genuinely global theme, not just the
  // Now Playing panel's own look
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setAccentColorName = useCallback((name: AccentColorName) => {
    setAccentColorNameState(name)
    localStorage.setItem(ACCENT_KEY, name)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    localStorage.setItem(THEME_KEY, next)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      accentColorName,
      accentColor: ACCENT_COLORS[accentColorName].hex,
      setAccentColorName,
      theme,
      setTheme,
    }),
    [accentColorName, theme, setAccentColorName, setTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
