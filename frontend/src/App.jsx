import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Language from './pages/Language'
import Welcome from './pages/Welcome'
import Consent from './pages/Consent'
import Guide from './pages/Guide'
import Practice from './pages/Practice'
import Study from './pages/Study'
import Debrief from './pages/Debrief'
import Admin from './pages/Admin'
import { loadSession } from './sessionStorage'

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [participantId, setParticipantId] = useState(null)
  const [blockOrder, setBlockOrder] = useState([])
  const [prolificPid, setProlificPid] = useState('')
  const [studyId, setStudyId] = useState('')
  const [score, setScore] = useState(null)
  const [completionCode, setCompletionCode] = useState(null)

  useEffect(() => {
    const stored = loadSession()
    if (stored?.session_id) {
      setSessionId(stored.session_id)
      setParticipantId(stored.participant_id ?? null)
      setBlockOrder(stored.block_order ?? [])
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Routes>
        <Route path="/" element={<Language />} />
        <Route path="/welcome" element={<Welcome setProlificPid={setProlificPid} setStudyId={setStudyId} />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/practice" element={<Practice />} />
        <Route
          path="/study"
          element={
            <Study
              sessionId={sessionId}
              setSessionId={setSessionId}
              participantId={participantId}
              setParticipantId={setParticipantId}
              blockOrder={blockOrder}
              setBlockOrder={setBlockOrder}
              prolificPid={prolificPid}
              studyId={studyId}
              setScore={setScore}
              setCompletionCode={setCompletionCode}
            />
          }
        />
        <Route
          path="/debrief"
          element={
            <Debrief
              sessionId={sessionId}
              score={score}
              setScore={setScore}
              completionCode={completionCode}
              setCompletionCode={setCompletionCode}
              setSessionId={setSessionId}
              setParticipantId={setParticipantId}
              setBlockOrder={setBlockOrder}
            />
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Language />} />
      </Routes>
    </div>
  )
}
