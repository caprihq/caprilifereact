import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { base44 } from '@/services/api'
import { reportError } from '@/services'
import type { Recipients } from '../logic/recipients'

/**
 * The admin broadcast. Its own hook so the screen reads as a form plus two
 * actions rather than a wall of async plumbing (§3.2).
 */
export const useBroadcast = ({
  title,
  body,
  recipients,
  onSent,
}: {
  readonly title: string
  readonly body: string
  /** Either an audience or a list of people — see `recipientsFor`. */
  readonly recipients: Recipients
  readonly onSent: () => void
}) => {
  const { show } = useFeedback()
  const [sending, setSending] = useState(false)

  const send = useCallback(async () => {
    setSending(true)
    try {
      const result = (await base44.functions.invoke('sendPushNotification', {
        title,
        body,
        // One or the other, never both: `recipientsFor` decides, so "Everyone" plus
        // three selected people cannot reach everyone by accident.
        ...recipients,
      })) as { data?: { sent?: number; failed?: number } }

      const sent = result.data?.sent ?? 0
      const failed = result.data?.failed ?? 0
      show({
        message: `Sent ${String(sent)}, failed ${String(failed)}.`,
        tone: failed > 0 ? 'warning' : 'success',
      })
      onSent()
    } catch (error) {
      reportError(error, 'sendPushNotification')
      show({ message: 'Send failed.', tone: 'error' })
    } finally {
      setSending(false)
    }
  }, [title, body, recipients, show, onSent])

  return { send, sending }
}

/**
 * Run the reminder sweep now, exactly as the schedule does.
 *
 * The sweep is idempotent and only ever sends what the clock already says is due,
 * so triggering it by hand cannot produce a notification that was not going to
 * happen anyway — it just happens sooner than the next cron tick. It is how
 * reminders get verified without waiting for the schedule, and how you check the
 * schedule is wired at all after a deploy.
 */
export const useReminderSweep = () => {
  const { show } = useFeedback()
  const [sweeping, setSweeping] = useState(false)

  const runSweep = useCallback(async () => {
    setSweeping(true)
    try {
      const result = (await base44.functions.invoke('sendPushNotification', {
        mode: 'reminders',
      })) as { data?: { considered?: number; notified?: number; quiet_suppressed?: number } }

      const considered = result.data?.considered ?? 0
      const notified = result.data?.notified ?? 0
      const quiet = result.data?.quiet_suppressed ?? 0
      show({
        message: `Checked ${String(considered)} upcoming, notified ${String(notified)}, quiet ${String(quiet)}.`,
        tone: notified > 0 ? 'success' : 'info',
      })
    } catch (error) {
      reportError(error, 'reminderSweep')
      show({ message: "Couldn't run the reminder sweep.", tone: 'error' })
    } finally {
      setSweeping(false)
    }
  }, [show])

  return { runSweep, sweeping }
}


