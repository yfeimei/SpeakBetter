import { useCallback, useEffect, useState } from 'react'
import { Home } from './pages/Home'
import { Practice } from './pages/Practice'
import { clearSessions, loadSessions, recordSession } from './services/progress'
import { primeVoices } from './services/tts'
import type { Level, SessionRecord } from './types'

type View = 'home' | 'practice'

/**
 * Hash-based routing, so the browser back button works and any static host
 * can serve the app without rewrite rules.
 */
function readView(): View {
  return window.location.hash === '#/practice' ? 'practice' : 'home'
}

export default function App() {
  const [view, setView] = useState<View>(readView)
  const [level, setLevel] = useState<Level>('beginner')
  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadSessions())
  /** Set when the learner chose "practice your own sentence" from the home page. */
  const [openCustomOnEntry, setOpenCustomOnEntry] = useState(false)

  useEffect(() => {
    primeVoices()

    const onHashChange = () => setView(readView())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: View) => {
    window.location.hash = next === 'practice' ? '#/practice' : '#/'
    setView(next)
    window.scrollTo({ top: 0 })
  }, [])

  const handleAttemptScored = useCallback(
    (score: number, exerciseId: number, sentence: string) => {
      setSessions(recordSession({ score, exerciseId, sentence, level }))
    },
    [level],
  )

  const handleClearHistory = useCallback(() => {
    clearSessions()
    setSessions([])
  }, [])

  if (view === 'practice') {
    return (
      <Practice
        level={level}
        onChangeLevel={setLevel}
        onHome={() => {
          setOpenCustomOnEntry(false)
          navigate('home')
        }}
        onAttemptScored={handleAttemptScored}
        autoOpenCustom={openCustomOnEntry}
      />
    )
  }

  return (
    <Home
      sessions={sessions}
      selectedLevel={level}
      onSelectLevel={setLevel}
      onStart={() => {
        setOpenCustomOnEntry(false)
        navigate('practice')
      }}
      onStartCustom={() => {
        setOpenCustomOnEntry(true)
        navigate('practice')
      }}
      onClearHistory={handleClearHistory}
    />
  )
}
