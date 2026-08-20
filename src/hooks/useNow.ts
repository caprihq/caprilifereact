import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

/**
 * A clock value that is stable within a render but refreshes over time.
 *
 * Reading `Date.now()` during render breaks React's purity rule: the value
 * changes on every re-render, so memoised work silently recomputes and two
 * components can disagree about what "now" is mid-pass.
 *
 * Holding it in state fixes that and improves behaviour — "Due today" flips to
 * "Needs attention" at midnight without the user relaunching, and the app
 * re-checks the moment it returns to the foreground rather than showing a
 * stale timestamp from hours ago.
 */
export const useNow = (intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setNow(Date.now())

    const timer = setInterval(tick, intervalMs)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick()
    })

    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [intervalMs])

  return now
}
