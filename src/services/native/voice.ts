import Voice from '@react-native-voice/voice'
import type { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice'
import { logWarn } from '@/utils'

/**
 * Speech recognition, native side.
 *
 * Replaces CapriVoicePlugin.swift from the Capacitor shell.
 *
 * Error codes are mapped to the same strings the web VoiceInput component
 * already knows (`permission_denied`, `no_speech`, `interrupted`,
 * `audio_reset`), so its user-facing messages keep working untouched.
 */

export type VoiceEmitter = (channel: string, payload: unknown) => void

let emit: VoiceEmitter | null = null
let listening = false

/**
 * Recognizer errors → the codes web/src/components/tasks/VoiceInput.jsx
 * already has user-facing messages for. First match wins, so the ordering is
 * significant: permission problems are the most actionable.
 */
const ERROR_PATTERNS: ReadonlyArray<readonly [readonly string[], string]> = [
  [['permission', 'denied', 'not-allowed'], 'permission_denied'],
  [['no speech', 'no-speech', 'no match'], 'no_speech'],
  [['interrupt'], 'interrupted'],
  [['audio'], 'audio_reset'],
]

const mapErrorCode = (event: SpeechErrorEvent): string => {
  const raw = `${event.error?.code ?? ''} ${event.error?.message ?? ''}`.toLowerCase()
  const match = ERROR_PATTERNS.find(([needles]) => needles.some((n) => raw.includes(n)))
  return match?.[1] ?? 'no_speech'
}

/** Wire the recognizer's callbacks to the page. Idempotent. */
export const initVoiceBridge = (emitter: VoiceEmitter): (() => void) => {
  emit = emitter

  Voice.onSpeechResults = (event: SpeechResultsEvent) => {
    const text = event.value?.[0]
    if (typeof text === 'string') emit?.('voice:result', { text, isFinal: true })
  }

  Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
    const text = event.value?.[0]
    if (typeof text === 'string') emit?.('voice:result', { text, isFinal: false })
  }

  Voice.onSpeechError = (event: SpeechErrorEvent) => {
    emit?.('voice:error', mapErrorCode(event))
    // The web component relies on onEnd always following onError to clear its
    // spinner — without it the mic stays permanently untappable.
    listening = false
    emit?.('voice:end', null)
  }

  Voice.onSpeechEnd = () => {
    listening = false
    emit?.('voice:end', null)
  }

  return () => {
    emit = null
    // Arrow-wrapped: passing Voice.removeAllListeners bare would detach it
    // from its object and lose `this`.
    void Voice.destroy()
      .then(() => Voice.removeAllListeners())
      .catch((error: unknown) => {
        logWarn('[CapriVoice] teardown failed', error)
      })
  }
}

export const isVoiceSupported = async (): Promise<boolean> => {
  try {
    return (await Voice.isAvailable()) ? true : false
  } catch {
    return false
  }
}

export const startVoice = async (options: unknown): Promise<null> => {
  const requested =
    typeof options === 'object' && options !== null
      ? (options as { lang?: unknown }).lang
      : undefined
  const lang = typeof requested === 'string' && requested ? requested : 'en-US'

  // A second start() while running would stack sessions and duplicate
  // partials — the same guard the Capacitor bridge needed.
  if (listening) {
    try {
      await Voice.stop()
    } catch (error) {
      logWarn('[CapriVoice] stop before restart failed', error)
    }
  }

  try {
    await Voice.start(lang)
    listening = true
  } catch (error) {
    emit?.('voice:error', 'permission_denied')
    emit?.('voice:end', null)
    logWarn('[CapriVoice] start failed', error)
  }
  return null
}

export const stopVoice = async (): Promise<null> => {
  try {
    await Voice.stop()
  } catch (error) {
    logWarn('[CapriVoice] stop failed', error)
    emit?.('voice:end', null)
  }
  listening = false
  return null
}
