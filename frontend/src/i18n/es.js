export default {
  lang: {
    choose: 'Elige tu idioma',
    chooseSub: 'Selecciona un idioma para continuar',
    english: 'English',
    spanish: 'Español',
  },
  landing: {
    title: 'Estudio de Desafíos en Tiempo Real',
    desc1:
      'Completarás una serie de desafíos interactivos rápidos que evalúan percepción, razonamiento, atención y habla.',
    desc2:
      'El estudio dura aproximadamente 15–20 minutos. Usa un entorno silencioso con un micrófono funcional.',
    start: 'Comenzar Estudio',
    participantDetected: 'ID de participante detectado',
  },
  consent: {
    title: 'Consentimiento Informado',
    intro:
      'Estás invitado/a a participar en un estudio de investigación sobre el rendimiento humano en desafíos interactivos en tiempo real. Este estudio es realizado por investigadores académicos y ha sido revisado según las directrices éticas institucionales.',
    purposeLabel: 'Propósito:',
    purpose:
      'Buscamos medir qué tan rápido y con qué precisión las personas completan diversas tareas cognitivas y perceptuales bajo presión de tiempo.',
    procedureLabel: 'Procedimiento:',
    procedure:
      'Completarás 20 desafíos cronometrados en cuatro categorías. Hay una guía y demo opcionales antes de empezar. Se registrarán tus respuestas y tiempos de reacción. La sesión dura aproximadamente 15–20 minutos.',
    risksLabel: 'Riesgos:',
    risks:
      'No se anticipan riesgos más allá de los encontrados en el uso cotidiano de una computadora. Puedes detenerte en cualquier momento sin penalización.',
    benefitsLabel: 'Beneficios:',
    benefits:
      'No hay beneficio directo para ti, pero tu participación contribuye al conocimiento científico sobre interacción humano-computadora e investigación en seguridad.',
    confidentialityLabel: 'Confidencialidad:',
    confidentiality:
      'Tus datos se almacenarán de forma anónima con un identificador generado aleatoriamente. No se recopilará información personal identificable más allá de tu ID de Prolific, usado solo para compensación.',
    voluntaryLabel: 'Participación voluntaria:',
    voluntary:
      'Tu participación es completamente voluntaria. Puedes retirarte en cualquier momento cerrando la ventana del navegador.',
    contactLabel: 'Contacto:',
    contact:
      'Si tienes preguntas sobre este estudio, contacta al equipo de investigación mediante mensajes de Prolific.',
    agree:
      'He leído y comprendido la información anterior, y acepto participar en este estudio.',
    continue: 'Continuar',
  },
  guide: {
    badge: 'Guía',
    title: 'Cómo funciona el estudio',
    subtitle:
      'Enfrentarás 20 desafíos cronometrados de cuatro tipos. Lee abajo y empieza cuando estés listo — o prueba primero la demo opcional.',
    tipsTitle: 'Antes de empezar',
    tips: {
      timer: 'Cada desafío tiene un temporizador. Responde antes de que se acabe el tiempo.',
      microphone: 'Un desafío requiere micrófono — usa un lugar silencioso.',
      focus: 'Mantén la concentración: 5 desafíos por tipo, 20 en total (~15–20 min).',
      optional: 'La demo es opcional y no se registra — solo te ayuda a conocer la interfaz.',
    },
    time: {
      perceptual: '8 seg',
      reasoning: '12 seg',
      attention: '15 seg',
      biometric: '10 seg',
    },
    desc: {
      perceptual: 'Empareja una imagen de referencia con una de cuatro opciones similares. Observa bien — los distractores engañan.',
      reasoning: 'Encuentra el siguiente número de una secuencia. Escribe tu respuesta y envía antes de que acabe el tiempo.',
      attention: 'Sigue un punto en movimiento. Cuando se detenga, haz clic lo más rápido posible.',
      biometric: 'Lee una frase corta en voz alta. Tu micrófono grabará — habla claro cuando se indique.',
    },
    startStudy: 'Comenzar 20 Desafíos',
    tryDemo: 'Probar Demo Opcional',
    speedTrial: 'Prueba de Velocidad',
    demoNote: 'La demo no se califica y no cuenta para tus resultados.',
  },
  practice: {
    optionalBadge: 'Demo opcional',
    completeTitle: '¡Demo completada!',
    completeDesc:
      'Has visto los cuatro tipos de desafío. Comienza el estudio real cuando quieras.',
    beginStudy: 'Comenzar 20 Desafíos',
    backGuide: 'Volver a la guía',
    skipToStudy: 'Saltar demo → Empezar estudio',
    round: 'Demo {{n}}/4 — {{family}}',
    notRecorded: 'No se registra — solo para aprender',
  },
  study: {
    startingSession: 'Iniciando sesión…',
    loadingChallenge: 'Cargando desafío…',
    loadError: 'Error al cargar el desafío. Inténtalo de nuevo.',
    retry: 'Reintentar',
    loading: 'Cargando…',
  },
  debrief: {
    title: '¡Gracias!',
    desc: 'Completaste el estudio. Tus respuestas nos ayudan a entender cómo los humanos rinden bajo presión en tiempo real.',
    yourScore: 'Tu puntuación',
    challengesPassed: 'desafíos superados',
    completionCode: 'Código de finalización de Prolific',
    copyCode: 'Copia este código y pégalo en Prolific para recibir tu pago.',
    footer:
      'Esta investigación estudia desafíos completables por humanos para sistemas de seguridad. Tus datos anonimizados se usarán únicamente para publicación académica.',
  },
  families: {
    perceptual: 'Coincidencia Perceptual',
    reasoning: 'Secuencia Numérica',
    attention: 'Seguimiento de Punto',
    biometric: 'Repetición de Frase',
  },
  progress: {
    challenge: 'Desafío',
    of: 'de',
  },
  timer: {
    sec: 'seg',
  },
  perceptual: {
    original: 'Original',
    selectMatch: 'Selecciona la coincidencia',
    option: 'Opción {{n}}',
    submit: 'Enviar',
    loading: 'Cargando desafío…',
  },
  reasoning: {
    placeholder: 'Tu respuesta',
    submit: 'Enviar',
  },
  attention: {
    follow: 'Sigue el punto en movimiento — haz clic cuando se detenga',
    clickFast: '¡Haz clic en el punto rápidamente!',
    stopped: '¡Punto detenido — haz clic ahora!',
  },
  biometric: {
    repeat: 'Repite esta frase',
    recording: 'Grabando… habla ahora',
    processing: 'Procesando…',
    submit: 'Enviar Grabación',
    needHttps: 'El micrófono requiere una conexión segura (HTTPS). Abre el estudio con https://, no con http://.',
    micDenied: 'Se bloqueó el acceso al micrófono. Permítelo en la configuración del navegador y pulsa Reintentar.',
    micRetry: 'Reintentar micrófono',
  },
  error: {
    title: 'Algo salió mal al cargar este desafío.',
    desc: 'Inténtalo de nuevo o actualiza la página.',
    retry: 'Reintentar',
  },
  speedTrial: {
    badge: 'Prueba de Velocidad',
    title: 'Prueba de Velocidad',
    subtitle:
      'Un solo tipo de desafío durante 60 segundos, sin pausas. Responde tantos como puedas antes de que se acabe el tiempo — al resolver uno, el siguiente aparece de inmediato.',
    loadError: 'Error al cargar el siguiente desafío. Inténtalo de nuevo.',
    startError: 'No se pudo iniciar la prueba de velocidad. Inténtalo de nuevo.',
    solved: 'Resueltos',
    attempted: 'Intentados',
    summaryTitle: '¡Ronda completada!',
    solvesPerMin: 'Resueltos / minuto',
    accuracy: 'Precisión',
    meanLatency: 'Tiempo medio de respuesta',
    measuredThroughput: 'Tu τh medido',
    comparison:
      'En la evaluación del artículo, los solucionadores automatizados promediaron {{autoLatency}}s por respuesta bajo este límite de {{deltaResp}}s — {{autoTauH}} respuestas válidas por ventana. Tú mediste {{tauH}}.',
    runAgain: 'Otra ronda',
    backToGuide: 'Volver a la guía',
  },
}
