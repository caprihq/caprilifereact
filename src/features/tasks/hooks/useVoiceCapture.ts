import { useCallback, useEffect, useRef, useState } from 'react'

import { initVoiceBridge, startVoice, stopVoice } from '@/services/native'
import { mmkvPrefStore } from '@/services/storage'
import { FREE_LIMITS } from '@/config'
import { usePlan } from '@/hooks/usePlan'
import { useNow } from '@/hooks/useNow'

/**
 * Voice-to-task capture.
 *
 * The free tier gets one capture a day, counted locally. That is per-device and
 * clearable, which the web client documented as an accepted trade-off: two attempts
 * at server-side counting failed because Base44's `.filter()` silently ignores range
 * queries.
 *
 * This comment used to add that "the genuinely expensive path (the AI parse) is
 * gated server-side regardless". It is not, and never was — every `InvokeLLM` call
 * in this app goes straight from the client, and the only server-side plan check
 * anywhere is in `autoScheduleTasks`. The limit here is a nudge, not an enforcement,
 * and it is worth being honest about which.
 */

const dayKey = (nowMs: number) => `capri.voice.${new Date(nowMs).toISOString().slice(0, 10)}`

export const voiceUsedToday = (nowMs: number): number => {
  const raw = mmkvPrefStore.getString(dayKey(nowMs))
  return raw ? (Number.parseInt(raw, 10) || 0) : 0
}

export const recordVoiceUse = (nowMs: number): void => {
  mmkvPrefStore.setString(dayKey(nowMs), String(voiceUsedToday(nowMs) + 1))
}

export const useVoiceCapture = (onTranscript: (text: string) => void) => {
  const { hasAccess } = usePlan()
  // Ticks past midnight, so the daily cap resets without a relaunch.
  const nowMs = useNow()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * What the recognizer has heard so far, before it commits.
   *
   * The bridge has always emitted partials — `isFinal: false` — and this hook
   * discarded them, so the mic looked frozen for the several seconds a sentence
   * takes. Showing them is the difference between "is this working?" and watching
   * your words appear.
   */
  const [partial, setPartial] = useState('')
  // Held in a ref so the recognizer subscription is created once, rather than
  // torn down and rebuilt every time the caller passes a new closure.
  // Assigned in an effect, never during render (react-hooks/refs).
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(
    () =>
      initVoiceBridge((channel, payload) => {
        if (channel === 'voice:result') {
          const { text, isFinal } = payload as { text: string; isFinal: boolean }
          if (isFinal) {
            setPartial('')
            onTranscriptRef.current(text)
          } else {
            setPartial(text)
          }
        } else if (channel === 'voice:error') {
          setPartial('')
          setError(MESSAGES[String(payload)] ?? DEFAULT_ERROR)
        } else if (channel === 'voice:end') {
          setListening(false)
          setPartial('')
        }
      }),
    [],
  )

  const limitReached =
    !hasAccess('unlimited_tasks') && voiceUsedToday(nowMs) >= FREE_LIMITS.voicePerDay

  const toggle = useCallback(async () => {
    setError(null)
    setPartial('')

    if (listening) {
      await stopVoice()
      setListening(false)
      return
    }

    if (limitReached) {
      setError(`Free plan allows ${String(FREE_LIMITS.voicePerDay)} voice capture a day.`)
      return
    }

    setListening(true)
    await startVoice({ lang: 'en-US' })
  }, [listening, limitReached])

  // A screen left mid-sentence must not hold the microphone open.
  useEffect(
    () => () => {
      void stopVoice()
    },
    [],
  )

  return { listening, partial, error, limitReached, toggle, recordUse: recordVoiceUse }
}

const DEFAULT_ERROR = "Voice capture didn't work. Please try again or type your task."

/** Codes come from lib/native/voice; wording matches the web client. */
const MESSAGES: Record<string, string> = {
  permission_denied: 'Microphone access is off. Enable it in Settings › CAPRI to use voice.',
  no_speech: "Didn't catch that — try again, a little closer to the mic.",
  interrupted: 'Recording stopped — something else needed the microphone.',
  audio_reset: 'Audio was interrupted. Please try again.',
}
