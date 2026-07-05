export default {
  lang: {
    choose: 'Choose your language',
    chooseSub: 'Select a language to continue',
    english: 'English',
    spanish: 'Español',
  },
  landing: {
    title: 'Real-Time Challenge Study',
    desc1:
      'You will complete a series of quick interactive challenges that test perception, reasoning, attention, and speech.',
    desc2:
      'The study takes about 15–20 minutes. Please use a quiet environment with a working microphone.',
    start: 'Start Study',
    participantDetected: 'Participant ID detected',
  },
  consent: {
    title: 'Informed Consent',
    intro:
      'You are invited to participate in a research study investigating human performance on real-time interactive challenges. This study is conducted by academic researchers and has been reviewed according to institutional ethical guidelines.',
    purposeLabel: 'Purpose:',
    purpose:
      'We aim to measure how quickly and accurately people can complete various cognitive and perceptual tasks under time pressure.',
    procedureLabel: 'Procedure:',
    procedure:
      'You will complete 20 timed challenges across four categories. An optional guide and demo are available before you begin. Your responses and reaction times will be recorded. The session takes approximately 15–20 minutes.',
    risksLabel: 'Risks:',
    risks:
      'There are no anticipated risks beyond those encountered in everyday computer use. You may stop at any time without penalty.',
    benefitsLabel: 'Benefits:',
    benefits:
      'There is no direct benefit to you, but your participation contributes to scientific knowledge about human-computer interaction and security research.',
    confidentialityLabel: 'Confidentiality:',
    confidentiality:
      'Your data will be stored anonymously using a randomly generated identifier. No personally identifying information will be collected beyond your Prolific ID, which is used only for compensation.',
    voluntaryLabel: 'Voluntary participation:',
    voluntary:
      'Your participation is entirely voluntary. You may withdraw at any time by closing the browser window.',
    contactLabel: 'Contact:',
    contact:
      'If you have questions about this study, please contact the research team through Prolific messaging.',
    agree:
      'I have read and understood the above information, and I agree to participate in this study.',
    continue: 'Continue',
  },
  guide: {
    badge: 'Guide',
    title: 'How the study works',
    subtitle:
      'Read how each challenge type works, then choose a session below. Both paths are recorded and contribute to the research.',
    tipsTitle: 'Before you begin',
    tips: {
      timer: 'Each challenge has a countdown timer. Answer before time runs out.',
      microphone: 'One challenge requires your microphone — use a quiet room.',
      focus: 'Stay focused: 5 challenges per type, 20 in total (~15–20 min).',
      optional: 'The demo is optional and not recorded — it only helps you learn the interface.',
    },
    time: {
      perceptual: '8 sec',
      reasoning: '12 sec',
      attention: '15 sec',
      biometric: '10 sec',
    },
    desc: {
      perceptual: 'Match a reference image to one of four similar options. Look carefully — distractors are tricky.',
      reasoning: 'Find the next number in a sequence. Type your answer and submit before the timer ends.',
      attention: 'Follow a moving dot on screen. When it stops, click it as quickly as you can.',
      biometric: 'Read a short phrase aloud. Your microphone will record — speak clearly when prompted.',
    },
    startStudy: 'Start 20 Challenges',
    tryDemo: 'Try optional demo first',
    speedTrial: 'Run Speed Trial',
    mainStudyTitle: 'Main study',
    mainStudyDesc: '20 timed challenges across all four types — the core session for the research.',
    mainStudyDuration: '~15–20 min',
    speedTrialTitle: 'Speed trial',
    speedTrialDesc: '60 seconds of back-to-back challenges in one type — measures your throughput under pressure.',
    speedTrialDuration: '~1 min',
    demoNote: 'The demo is not scored and does not count toward your results.',
  },
  practice: {
    optionalBadge: 'Optional demo',
    completeTitle: 'Demo complete!',
    completeDesc:
      'You have seen all four challenge types. Start the real study whenever you are ready.',
    beginStudy: 'Start 20 Challenges',
    backGuide: 'Back to guide',
    skipToStudy: 'Skip demo → Start study',
    round: 'Demo {{n}}/4 — {{family}}',
    notRecorded: 'Not recorded — for learning only',
  },
  study: {
    startingSession: 'Starting session…',
    loadingChallenge: 'Loading challenge…',
    loadError: 'Failed to load challenge. Please try again.',
    retry: 'Retry',
    loading: 'Loading…',
  },
  debrief: {
    title: 'Thank you!',
    desc: 'You completed the study. Your responses help us understand how humans perform under real-time pressure.',
    yourScore: 'Your score',
    challengesPassed: 'challenges passed',
    completionCode: 'Prolific completion code',
    copyCode: 'Copy this code and paste it into Prolific to receive your payment.',
    footer:
      'This research investigates human-completable challenges for security systems. Your anonymized data will be used solely for academic publication.',
  },
  families: {
    perceptual: 'Perceptual Matching',
    reasoning: 'Number Sequence',
    attention: 'Dot Tracking',
    biometric: 'Phrase Repetition',
  },
  progress: {
    challenge: 'Challenge',
    of: 'of',
  },
  timer: {
    sec: 'sec',
  },
  perceptual: {
    original: 'Original',
    selectMatch: 'Select the match',
    option: 'Option {{n}}',
    submit: 'Submit',
    loading: 'Loading challenge…',
  },
  reasoning: {
    placeholder: 'Your answer',
    submit: 'Submit',
  },
  attention: {
    follow: 'Follow the moving dot — click it when it stops',
    clickFast: 'Click on the dot quickly!',
    stopped: 'Dot stopped — click now!',
  },
  biometric: {
    repeat: 'Repeat this phrase',
    recording: 'Recording… speak now',
    processing: 'Processing…',
    submit: 'Submit Recording',
    needHttps: 'Microphone requires a secure connection (HTTPS). Please open the study via https:// — not plain http://.',
    micDenied: 'Microphone access was blocked. Allow the microphone in your browser settings, then tap Retry.',
    micRetry: 'Retry microphone',
  },
  error: {
    title: 'Something went wrong loading this challenge.',
    desc: 'Please try again or refresh the page.',
    retry: 'Retry',
  },
  speedTrial: {
    badge: 'Speed Trial',
    title: 'Speed Trial',
    subtitle:
      "60 seconds, one challenge type, back-to-back. Answer as many as you can before the clock runs out — solve one and the next appears immediately.",
    loadError: 'Failed to load the next challenge. Please try again.',
    startError: 'Could not start the speed trial. Please try again.',
    solved: 'Solved',
    attempted: 'Attempted',
    summaryTitle: 'Round complete!',
    solvesPerMin: 'Solved / minute',
    accuracy: 'Accuracy',
    meanLatency: 'Mean response time',
    measuredThroughput: 'Your measured τh',
    comparison:
      "In the paper's evaluation, automated solvers averaged {{autoLatency}}s per response under this {{deltaResp}}s deadline — {{autoTauH}} valid responses per window. You measured {{tauH}}.",
    runAgain: 'Run again',
    backToGuide: 'Back to guide',
  },
}
