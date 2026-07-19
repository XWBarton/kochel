# Handoff: Classical Music Library — Web &amp; iOS Design

## Overview
Interface design for a self-hosted classical music library/streaming app: a web player and an iOS companion app that should feel like one product. Data model is composer-first: Composer → Works → Recordings, with a Work having movements and each Recording being a specific performer/conductor/ensemble/year performance.

## About the Design Files
The bundled file (`Classical Library System.dc.html`) is a **design reference built in HTML** — a live, interactive prototype showing intended look, type system, color system, and behavior. It is not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React/SwiftUI/native/whatever the web app and iOS app already use) using that codebase's own component and state patterns — or, if no environment exists yet, pick the most appropriate stack and implement there. The file opens directly in a browser to view/interact with it, and its inline styles/markup are readable as a literal spec of colors, spacing and type.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and the theme/accent variants are final. Treat hex values and type specs below as exact. Composer/work/recording data shown (Florence Price, J.S. Bach, etc.) is illustrative sample content, not required copy.

## Design System

### Palette
- Ink (near-black): `#161513`
- Paper (ivory/off-white): `#FAFAF7`
- Accent (default): Rust `#B6401F` — used ONLY for the currently-playing state, primary actions (play triangles/buttons, "Compare recordings" links, the default-recording tag, download-in-progress indicators), and small highlights (active tab underline, sunburst center dot). Never decorative or used for variety.
- Accent alternatives (equally valid, same functional role, pick one for the shipped app): Deep teal `#1F6B63`, Mustard `#B98A1E`, Cobalt `#33489E`.
- The Now-Playing screen (web + iOS) additionally has a **panel theme**: `dark` (ink background/ivory text, like a record sleeve) or `light` (ivory background/ink text). All hairlines/strokes on that screen are theme-relative opacities of whichever color is the panel's foreground — see Design Tokens. Every other screen (browse/detail/compare/search/downloads) always sits on the ivory page surface with ink text/hairlines, regardless of this toggle.

### Typography
- Display serif (composer names, major headings): **Abril Fatface** (Google Font), regular weight, used large (19–64px depending on context).
- Body/work-title serif: **EB Garamond** (Google Font), 400/500/600 weights, italic for movement subtitles/tempo markings and dates.
- Labels ("NOW PLAYING", "MOVEMENTS", section headers, recording metadata, tab labels): EB Garamond, uppercase, `letter-spacing: 0.14em–0.28em`, small (11–13px), reduced opacity (0.5–0.6) when secondary.
- Roman numerals for movement numbers: Abril Fatface.
- Only these two font families are used anywhere in the product.

### Motifs
- **Sunburst / record-label mark**: concentric circles (radius ~58 and ~95 of a 200×200 viewBox) plus 24 radiating hairlines every 15°, with a small solid accent dot at the center. Used as the hero visual on Now-Playing (both platforms) and on the mini-player/lock-screen as a small "now playing" indicator; intended to double as a loading/buffering motif elsewhere (animate opacity or slow rotation while buffering — not built in the prototype).
- **Hairline double-rule**: two 1px `border-top` lines ~4px apart, used to bracket section labels like a printed programme.
- Flat surfaces only — no gradients, no drop shadows, no rounded-card treatment anywhere except circular transport controls and the device chrome itself. Dividers are always 1px hairlines at partial opacity, never full-opacity rules except top-level section separators.

## Screens

### Web (desktop-first, responsive)
1. **Type & Color System reference** — swatches for ink/paper/4 accent options (with a live "Selected" tag bound to whichever accent is active) and a type specimen block. Reference only, not a real app screen.
2. **Composer Browse** — alphabetical index grouped by first letter (big Abril Fatface letter in a fixed-width left column, composer rows to the right: name in Abril Fatface, birth–death dates in italic EB Garamond, work count tracked-uppercase on the right). A narrow-window variant (section 09) shows the same content collapsed to a single stacked column below ~600px: letter above its group, name/dates/count stacked vertically per row instead of sharing a line.
3. **Composer Detail** — composer name (64px display serif) + dates + catalogued-work count, then works grouped by genre (Orchestral / Chamber / Piano, etc.) with tracked-uppercase genre headers; each work row has an accent play-triangle, title, and recording count.
4. **Work Detail** — small tracked-uppercase composer name (clickable back to composer), work title in EB Garamond 500 (NOT the display serif — that's reserved for composer identity), genre/movement-count/composed-year meta line, a "Compare Recordings →" accent link, a list of every recording (ensemble/conductor, label + year, total duration, accent play-triangle), then a generic movement breakdown (roman numeral, tempo marking, duration).
5. **Compare Recordings** — CSS-grid table: first column = movement (roman numeral + tempo), one column per recording. Header row per column shows ensemble/conductor/label/year; the library's default recording gets an accent tracked-uppercase "Default in Library" tag — the only color in the table, used meaningfully. Rows below = per-movement duration per recording, footer row = totals.
6. **Search Results** — query shown as typed value in a hairline-underlined field (no rounded search pill). Results grouped by type (Composers / Works / Recordings) under tracked-uppercase group labels, hairline row dividers, secondary metadata right-aligned in muted uppercase.
7. **Now Playing (full view, not a mini player)** — two-column dark/light "sleeve" panel: ~42% sunburst mark in a hairline inset frame, ~58% content (header info → movement list → transport), `padding: 56px 64px`. See "Now Playing detail" below for exact spec — this is the anchor screen.

### iOS (native feel)
1. **Library Home** — "Library" large-serif title, a 3-tab row (Composers/Works/Conductors) with the active tab accent-underlined, single-column composer list, and a persistent mini-player bar docked above the home indicator.
2. **Work Detail** — composer breadcrumb label, work title, "Compare →" accent link, condensed recordings list (≥44px rows), a movement preview, and the same docked mini-player bar.
3. **Now Playing (anchor screen)** — same content/order as web, restacked vertically: label → 228px sunburst → composer (32px) → work title → italic current-movement line → progress + time → transport (prev / accent play-pause / next, ≥44px targets) → hairline divider → scrollable movement list → recording-info footer. No native iOS large-title nav bar — the custom header replaces it; content starts ~64px down to clear the status bar/dynamic island.
4. **Mini Player** — thin bar docked above the home indicator: small sunburst-style indicator (simplified to two circles + accent dot at this size), truncated "Composer — movement" text, prev/pause/next icons, optional thin accent progress line across the very top edge of the bar.
5. **Lock-screen / Control-Centre style** — dark ink "wallpaper," centered 180px sunburst, composer/work/movement text, and a larger transport row (56px accent play button) matching system media-widget conventions but in this product's own visual language (flat, no shadows).
6. **Search** — hairline-underlined query field, grouped results (Composers/Works), docked mini-player bar.
7. **Downloads / Offline** — storage-used hairline bar (accent fill = used portion, meaningful state), list of downloaded items each showing size + a bordered (unfilled) quality tag (`LOSSLESS`/`HIGH`), one item mid-download shows an accent percentage + accent progress hairline instead of a static size — the only two accent uses on this screen, both functional (usage level, in-progress state).

## Now Playing — Detail Spec (the anchor screen, web + iOS)
- Header: "NOW PLAYING" tracked-uppercase label → composer name (Abril Fatface, 56px web / 32px iOS) → work title (EB Garamond, 24px web / 18px iOS) → current movement's roman numeral + tempo marking in italic (opacity 0.7) → recording/performer credit line (tracked uppercase, opacity 0.55).
- Movement list: "MOVEMENTS" label, then one row per movement — roman numeral (Abril Fatface) + tempo/movement name (EB Garamond, flex) + duration (tabular figures, opacity 0.55). Rows are tap/click targets that jump to that movement; the active row's numeral + text render in the accent color, all others in the panel's foreground color at ~85% opacity. Hairline row dividers.
- Transport: 1px progress track at 25% panel-foreground opacity, with an accent-filled segment + accent circular handle at the current position. Elapsed / remaining time below in tabular figures. Controls: prev-movement triangle, circular accent play/pause button (60px web / 64px iOS, ivory bars/triangle glyph inside), next-movement triangle, all centered.

## Interactions & Behavior
- Movement rows (web + iOS Now Playing) are clickable/tappable and jump directly to that movement — this updates the header's current-movement line, the active row highlight, the progress bar, and elapsed/remaining time. In the prototype, web and iOS share one state model so both mockups move together (demonstrating one shared session across platforms).
- Play/pause is currently a static "playing" (pause icon) state in the prototype — wire to real playback state in implementation; the icon should flip between play-triangle and pause-bars.
- Prev/next triangle controls move to the adjacent movement in the current work, clamped at the first/last movement (not built in the prototype).
- The progress bar should be draggable/scrubbable in the real implementation (the prototype only renders a static position per movement).
- Composer Detail's play-triangles and Work Detail's play-triangles are primary actions — clicking should start playback of that work/recording (from movement I, or resume last position — implementation decision).
- "Compare Recordings →" navigates from Work Detail to the Compare Recordings view for that work.
- Search field is illustrated with a static typed query — wire to live-filtering across composer/work/conductor/performer names in the real implementation.
- Mini-player bar is persistent across Library Home / Work Detail / Search (and, by extension, any other list screen) — tapping it should open the full Now Playing screen.
- Downloads: the in-progress item's accent percentage and progress hairline should update live during a real download; completed items show a static size + quality tag instead.

## State Management
Now-Playing session (shared across web/iOS):
- `currentWorkId`, `currentRecordingId`
- `currentMovementIndex` — drives numeral/label highlighting, header subtitle, duration lookups
- `elapsedSeconds` — drives progress-bar fill and time labels, ticks during playback
- `isPlaying` — drives play/pause icon everywhere it appears (Now Playing, mini-player, lock screen)

App-level / theme settings (not per-session):
- `accentColor` — one of the 4 approved hex values
- `panelTheme` — `dark` | `light`, affects only the Now-Playing screen surface

Other view state (not deeply modeled in the prototype, but implied):
- Composer/Work/Recording browsing state (selected composer, selected work, selected recording for Work Detail vs. Compare view)
- Search query + result sets by type
- Download queue with per-item progress/size/quality

## Design Tokens
- Colors: Ink `#161513`, Paper `#FAFAF7`, Accent (pick one, apply consistently across the whole app): Rust `#B6401F` / Teal `#1F6B63` / Mustard `#B98A1E` / Cobalt `#33489E`.
- Standard-surface (browse/detail/compare/search/downloads) hairlines: dividers `rgba(22,21,19,0.12)`, section-top rules solid `#161513`.
- Now-Playing panel-relative opacities (apply to whichever of ink/paper is the panel's foreground color): dividers/row-hairlines `15%`, secondary borders `25%`, header rule `30%`, sunburst circle strokes `50%`, sunburst rays `55%`, secondary labels `55–60%`, inactive movement text `85%`.
- Type sizes in use: 56–64px / 44px / 32–38px (display serif headings), 24–42px / 18–21px (body serif), 14–19px italic (subtitles/dates), 11–13px tracked-uppercase (labels/meta), 12–14px tabular (durations/timecodes/percentages).
- Letter-spacing: labels `0.14em–0.28em`.
- Border radius: none anywhere in the UI itself except circular transport controls (play button, scrub handle) and the iOS device chrome.
- Shadows: none anywhere.
- Minimum tap targets on iOS: 44px (movement rows, transport buttons).

## Assets
No bitmap/vector image assets anywhere — the sunburst mark and all icons (play/pause bars, prev/next triangles, download/quality tags) are drawn with basic SVG shapes and CSS, no external images. Fonts load from Google Fonts (Abril Fatface, EB Garamond).

## Files
- `Classical Library System.dc.html` — the full prototype: system reference, all 7 web screens (incl. the narrow/responsive composer-browse variant), and all 7 iOS screens. Open directly in a browser to view/interact — clicking movement rows on the Now Playing screens is wired; everything else is static/illustrative layout.
- `ios-frame.jsx` — generic iOS device-frame component used purely to present the iOS screens (status bar/home-indicator/bezel chrome only — not part of the app's own UI, don't port this into the real iOS app).
