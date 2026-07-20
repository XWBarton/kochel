import type { AccentColorName } from '../settings/SettingsContext'
import { ACCENT_COLORS, useSettings } from '../settings/SettingsContext'
import styles from './Settings.module.css'

export function Settings() {
  const { accentColorName, setAccentColorName, theme, setTheme } = useSettings()

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Settings</div>
      <div className={styles.intro}>
        The accent color is used only for the currently-playing state, primary actions, and small
        highlights — never decoration. Theme applies across the whole app, and can also be toggled from
        the Now Playing screen.
      </div>

      <div className={styles.sectionLabel}>Accent color</div>
      <div className={styles.swatchRow}>
        {(Object.keys(ACCENT_COLORS) as AccentColorName[]).map((name) => {
          const isSelected = name === accentColorName
          return (
            <button className={styles.swatch} key={name} onClick={() => setAccentColorName(name)}>
              <div className={styles.swatchFill} style={{ background: ACCENT_COLORS[name].hex }} />
              <div className={styles.swatchLabel}>{ACCENT_COLORS[name].label}</div>
              <div className={styles.swatchHex}>{ACCENT_COLORS[name].hex}</div>
              <div className={`${styles.swatchTag} ${isSelected ? styles.selected : styles.alternative}`}>
                {isSelected ? 'Selected' : 'Alternative'}
              </div>
            </button>
          )
        })}
      </div>

      <div className={styles.sectionLabel}>Theme</div>
      <div className={styles.themeRow}>
        <button
          className={`${styles.themeOption} ${theme === 'dark' ? styles.active : ''}`}
          onClick={() => setTheme('dark')}
        >
          <div className={`${styles.themePreview} ${styles.dark}`}>
            <div className={styles.themePreviewDot} />
          </div>
          <div className={styles.themeLabel}>Dark</div>
        </button>
        <button
          className={`${styles.themeOption} ${theme === 'light' ? styles.active : ''}`}
          onClick={() => setTheme('light')}
        >
          <div className={`${styles.themePreview} ${styles.light}`}>
            <div className={styles.themePreviewDot} />
          </div>
          <div className={styles.themeLabel}>Light</div>
        </button>
      </div>
      <div className={styles.themeNote}>
        Like a record sleeve — dark ink background with ivory text, or the reverse. Applies everywhere,
        not just the Now Playing screen. Defaults to your system's theme the first time you open Köchel.
      </div>
    </div>
  )
}
