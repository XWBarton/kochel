import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CompareRecordings } from './pages/CompareRecordings'
import { ComposerBrowse } from './pages/ComposerBrowse'
import { ComposerDetail } from './pages/ComposerDetail'
import { ImportPage } from './pages/Import/ImportPage'
import { NowPlaying } from './pages/NowPlaying'
import { SearchResults } from './pages/SearchResults'
import { Settings } from './pages/Settings'
import { WorkDetail } from './pages/WorkDetail'
import { PlaybackProvider } from './playback/PlaybackContext'
import { SettingsProvider } from './settings/SettingsContext'

function App() {
  return (
    <SettingsProvider>
      <PlaybackProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ComposerBrowse />} />
              <Route path="/composers/:composerId" element={<ComposerDetail />} />
              <Route path="/works/:workId" element={<WorkDetail />} />
              <Route path="/works/:workId/compare" element={<CompareRecordings />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/now-playing" element={<NowPlaying />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/import" element={<ImportPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PlaybackProvider>
    </SettingsProvider>
  )
}

export default App
