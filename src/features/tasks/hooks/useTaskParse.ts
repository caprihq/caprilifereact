import { useCallback, useState } from 'react'

import { useFeedback } from '@/hooks/useFeedback'
import { usePlan } from '@/hooks/usePlan'
import { parseTaskHeuristically } from '@/features/tasks/logic/parseTaskInput'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import type { Engine } from '@/services/analytics/events'
import { withStatedTime } from '../logic/statedTime'
import { parseTaskWithAI } from '../services/aiTaskParser'

/**
 * Raw text → structured fields, without saving.
 *
 * Its own hook so `useAddTask` stays inside the body limit (§3.2), and because the
 * two halves of capture are genuinely separate: reading what the user wrote, and
 * deciding what the task is worth.
 *
 * `parser` says which engine read the last input, for `task_created`: the model, or
 * the local heuristic (a free plan, or a model call that failed).
 *
 * Either way, a time the person said ("dinner at 7pm") makes the draft a scheduled
 * event at that time — see `withStatedTime`. Neither parser reads clock times.
 */
export const useTaskParse = (userEmail: string | null, nowMs: number, timeZone: string) => {
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const [parsing, setParsing] = useState(false)
  const [parser, setParser] = useState<Engine>('local')

  const parse = useCallback(
    async (input: string): Promise<ParsedTask> => {
      const trimmed = input.trim()
      if (!trimmed) return { title: '' }

      const when = { nowMs, timeZone }
      // The AI pass is a paid perk; everyone else still gets useful defaults.
      if (!hasAccess('analytics')) {
        setParser('local')
        return withStatedTime(parseTaskHeuristically(trimmed, nowMs), trimmed, when)
      }

      setParsing(true)
      try {
        const outcome = await parseTaskWithAI(trimmed, { nowMs, timeZone, userEmail })
        setParser(outcome.usedAI ? 'ai' : 'local')

        // Said out loud rather than degraded in silence: the user is watching for
        // CAPRI to have understood them, and a heuristic parse just looks like CAPRI
        // doing a worse job for no reason.
        if (!outcome.usedAI) {
          show({
            message: "CAPRI couldn't read that one. Check the details before saving.",
            tone: 'warning',
          })
        }

        return withStatedTime(outcome.draft, trimmed, when)
      } finally {
        setParsing(false)
      }
    },
    [hasAccess, nowMs, timeZone, userEmail, show],
  )

  return { parse, parsing, parser }
}
