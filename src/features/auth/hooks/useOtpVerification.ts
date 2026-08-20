import { useCallback, useEffect, useRef, useState } from 'react'

import { useNow } from '@/hooks/useNow'
import {
  canResend,
  formatCountdown,
  isCodeSubmittable,
  isOtpExpired,
  normalizeCode,
  otpExpiresAt,
  otpRemainingMs,
  resendCooldownRemainingMs,
} from '../logic/otpPolicy'
import { resendEmailOtp, verifyEmailOtp } from '../services/emailAuth'
import { useAuth } from '../model/AuthContext'

/**
 * Code entry, verification, expiry countdown and resend cooldown.
 *
 * All the timing arithmetic lives in `logic/otpPolicy`, which is pure and
 * tested; this hook only holds state and performs the calls, keeping the screen
 * to layout.
 */
export const useOtpVerification = (
  email: string,
  expiresInMinutes: number | undefined,
  needsCode = false,
) => {
  const { adoptToken } = useAuth()
  // Ticks every second so the countdown moves and the cooldown reopens on its
  // own, without the user tapping anything.
  const nowMs = useNow(1000)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Only set when this screen sends one — the first code was sent before we
  // arrived, so Resend is available immediately.
  const [lastResentAt, setLastResentAt] = useState<number | null>(null)
  const [sentAt] = useState(() => Date.now())

  const expiresAt = otpExpiresAt(sentAt, expiresInMinutes)
  const remaining = otpRemainingMs(expiresAt, nowMs)
  const expired = isOtpExpired(expiresAt, nowMs)
  const resendReady = canResend(lastResentAt, nowMs)
  const canSubmit = isCodeSubmittable(code) && !busy && !expired

  /**
   * Ask for a code on arrival, when the caller says none was sent.
   *
   * Guarded by a ref rather than state: a re-render must not be able to fire a
   * second request, because each new code invalidates the previous one — the user
   * would be typing a code that had just been retired.
   */
  const requested = useRef(false)
  useEffect(() => {
    if (!needsCode || requested.current) return
    requested.current = true

    void (async () => {
      const result = await resendEmailOtp(email)
      if (result.kind === 'error') {
        setError(result.message)
        return
      }
      setLastResentAt(Date.now())
      setNotice('We sent a new code to your email.')
    })()
  }, [email, needsCode])

  const submit = useCallback(async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    setNotice(null)

    // Base44 verifies the code and answers with a session token.
    const result = await verifyEmailOtp(email, code)
    if (result.kind === 'token') {
      await adoptToken(result.token)
    } else if (result.kind === 'error') {
      setError(result.message)
    }
    setBusy(false)
  }, [adoptToken, canSubmit, code, email])

  const resend = useCallback(async () => {
    setError(null)
    setNotice(null)
    const result = await resendEmailOtp(email)
    if (result.kind === 'error') {
      setError(result.message)
      return
    }
    setLastResentAt(Date.now())
    setNotice('A new code is on its way.')
  }, [email])

  return {
    code,
    onChangeCode: useCallback((next: string) => setCode(normalizeCode(next)), []),
    error,
    notice,
    busy,
    expired,
    canSubmit,
    resendReady,
    /** Null when Base44 gave no expiry, so the screen shows no deadline. */
    countdown: remaining === null || expired ? null : formatCountdown(remaining),
    resendLabel: resendReady
      ? 'Resend code'
      : `Resend in ${formatCountdown(resendCooldownRemainingMs(lastResentAt, nowMs))}`,
    submit,
    resend,
  }
}
