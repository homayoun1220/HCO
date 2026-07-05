import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

export const startSession = (prolificPid, studyId, opts = {}) =>
  api.post('/api/session/start', {
    prolific_pid: prolificPid,
    study_id: studyId,
    mode: opts.mode ?? 'standard',
    family: opts.family ?? '',
  })

export const issueChallenge = (sessionId, family, trialIndex) =>
  api.post('/api/challenge/issue', {
    session_id: sessionId,
    family,
    trial_index: trialIndex,
  })

export const submitChallenge = (sessionId, challengeId, response) =>
  api.post('/api/challenge/submit', {
    session_id: sessionId,
    challenge_id: challengeId,
    response,
  })

export const completeSession = (sessionId) =>
  api.post('/api/session/complete', { session_id: sessionId })

export default api
