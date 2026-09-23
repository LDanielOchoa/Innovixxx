import { ref, onMounted, onUnmounted } from 'vue'

export interface OpcionesVoz {
  velocidad?: number
  tono?: number
  volumen?: number
  voz?: SpeechSynthesisVoice | null
  idioma?: string
  alIniciar?: () => void
  alTerminar?: () => void
  alError?: (evento: SpeechSynthesisErrorEvent) => void
}

const CLAVE_ALMACENAMIENTO_SILENCIO = 'innovix_tts_silenciado'

export function useSintesisVoz() {
  const estaSoportado = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
  const estaHablando = ref(false)
  const estaPausado = ref(false)
  const estaSilenciado = ref(
    typeof window !== 'undefined'
      ? localStorage.getItem(CLAVE_ALMACENAMIENTO_SILENCIO) === 'true'
      : false
  )

  const voces = ref<SpeechSynthesisVoice[]>([])
  const vozSeleccionada = ref<SpeechSynthesisVoice | null>(null)
  const volumen = ref(1)
  const velocidad = ref(1)
  const tono = ref(1)
  const idiomaPorDefecto = ref('es-ES')

  // Carga y selección de voces disponibles en el navegador
  const cargarVoces = () => {
    if (!estaSoportado.value) return
    const listaVoces = window.speechSynthesis.getVoices()
    voces.value = listaVoces

    if (listaVoces.length > 0 && !vozSeleccionada.value) {
      const vozEspanol = listaVoces.find(v => v.lang.toLowerCase().startsWith('es'))
      vozSeleccionada.value = vozEspanol || listaVoces[0] || null
    }
  }

  // Obtener la mejor voz para el idioma especificado (español o inglés)
  const obtenerVozPorIdioma = (codigoIdioma: string): SpeechSynthesisVoice | null => {
    if (!voces.value || voces.value.length === 0) {
      cargarVoces()
    }
    const prefijo = (codigoIdioma || 'es').toLowerCase().substring(0, 2)
    const vozEncontrada = voces.value.find(v => v.lang.toLowerCase().startsWith(prefijo))
    return vozEncontrada || vozSeleccionada.value || voces.value[0] || null
  }

  const hablar = (texto: string, opciones?: OpcionesVoz): boolean => {
    if (!estaSoportado.value || estaSilenciado.value || !texto.trim()) {
      return false
    }

    try {
      // Si el sintetizador está pausado por inactividad del navegador, se reanuda
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }

      const mensaje = new SpeechSynthesisUtterance(texto)
      const idiomaSolicitado = opciones?.idioma || idiomaPorDefecto.value
      const esIngles = idiomaSolicitado.toLowerCase().startsWith('en')

      // Configuración de propiedades
      mensaje.lang = esIngles ? 'en-US' : (idiomaSolicitado.toLowerCase().startsWith('es') ? 'es-ES' : idiomaSolicitado)
      mensaje.rate = opciones?.velocidad ?? velocidad.value
      mensaje.pitch = opciones?.tono ?? tono.value
      mensaje.volume = opciones?.volumen ?? volumen.value

      const vozActual = opciones?.voz || obtenerVozPorIdioma(mensaje.lang)
      if (vozActual) {
        mensaje.voice = vozActual
      }

      mensaje.onstart = () => {
        estaHablando.value = true
        estaPausado.value = false
        opciones?.alIniciar?.()
      }

      mensaje.onend = () => {
        estaHablando.value = window.speechSynthesis.speaking
        opciones?.alTerminar?.()
      }

      mensaje.onerror = (evento) => {
        estaHablando.value = window.speechSynthesis.speaking
        opciones?.alError?.(evento)
      }

      window.speechSynthesis.speak(mensaje)
      return true
    } catch (error) {
      console.error('[SintesisVoz] Error al reproducir mensaje de voz:', error)
      return false
    }
  }

  const pausar = () => {
    if (!estaSoportado.value) return
    window.speechSynthesis.pause()
    estaPausado.value = true
  }

  const reanudar = () => {
    if (!estaSoportado.value) return
    window.speechSynthesis.resume()
    estaPausado.value = false
  }

  const cancelar = () => {
    if (!estaSoportado.value) return
    window.speechSynthesis.cancel()
    estaHablando.value = false
    estaPausado.value = false
  }

  const alternarSilencio = (): boolean => {
    estaSilenciado.value = !estaSilenciado.value
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLAVE_ALMACENAMIENTO_SILENCIO, String(estaSilenciado.value))
    }
    if (estaSilenciado.value) {
      cancelar()
    }
    return estaSilenciado.value
  }

  const probarVoz = (textoPrueba?: string, idioma?: string) => {
    const lang = idioma || idiomaPorDefecto.value
    const esIngles = lang.toLowerCase().startsWith('en')
    const mensaje = textoPrueba || (esIngles ? 'Test alarm for monitoring system.' : 'Alarma de prueba del sistema de monitoreo.')
    hablar(mensaje, { idioma: esIngles ? 'en-US' : 'es-ES' })
  }

  onMounted(() => {
    if (estaSoportado.value) {
      cargarVoces()
      if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = cargarVoces
      }
    }
  })

  onUnmounted(() => {
    cancelar()
  })

  return {
    estaSoportado,
    estaHablando,
    estaPausado,
    estaSilenciado,
    voces,
    vozSeleccionada,
    volumen,
    velocidad,
    tono,
    idiomaPorDefecto,
    cargarVoces,
    obtenerVozPorIdioma,
    hablar,
    pausar,
    reanudar,
    cancelar,
    alternarSilencio,
    probarVoz
  }
}
