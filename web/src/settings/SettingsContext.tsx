import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type AccentColorName = 'rust' | 'teal' | 'mustard' | 'cobalt'
export type PanelTheme = 'dark' | 'light'

export const ACCENT_COLORS: Record<AccentColorName, { hex: string; label: string }> = {
  rust: { hex: '#B6401F', label: 'Rust' },
  teal: { hex: '#1F6B63', label: 'Deep teal' },
  mustard: { hex: '#B98A1E', label: 'Mustard' },
  cobalt: { hex: '#33489E', label: 'Cobalt' },
}

const ACCENT_KEY = 'kochel:accentColorName'
const PANEL_THEME_KEY = 'kochel:panelTheme'

function isAccentColorName(value: string | null): value is AccentColorName {
  return value !== null && value in ACCENT_COLORS
}

function isPanelTheme(value: string | null): value is PanelTheme {
  return value === 'dark' || value === 'light'
}

interface SettingsContextValue {
  accentColorName: AccentColorName
  accentColor: string
  setAccentColorName: (name: AccentColorName) => void
  panelTheme: PanelTheme
  setPanelTheme: (theme: PanelTheme) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accentColorName, setAccentColorNameState] = useState<AccentColorName>(() => {
    const stored = localStorage.getItem(ACCENT_KEY)
    return isAccentColorName(stored) ? stored : 'rust'
  })
  const [panelTheme, setPanelThemeState] = useState<PanelTheme>(() => {
    const stored = localStorage.getItem(PANEL_THEME_KEY)
    return isPanelTheme(stored) ? stored : 'dark'
  })

  // the accent is consumed both by CSS (via the custom property, for every
  // hairline/link/play-triangle styled with var(--accent)) and directly in
  // JS (the Sunburst SVG's accent prop, which needs a resolved color string)
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENT_COLORS[accentColorName].hex)
  }, [accentColorName])

  const setAccentColorName = useCallback((name: AccentColorName) => {
    setAccentColorNameState(name)
    localStorage.setItem(ACCENT_KEY, name)
  }, [])

  const setPanelTheme = useCallback((theme: PanelTheme) => {
    setPanelThemeState(theme)
    localStorage.setItem(PANEL_THEME_KEY, theme)
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      accentColorName,
      accentColor: ACCENT_COLORS[accentColorName].hex,
      setAccentColorName,
      panelTheme,
      setPanelTheme,
    }),
    [accentColorName, panelTheme, setAccentColorName, setPanelTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
