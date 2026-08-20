import { useState } from 'react'
import { View } from 'react-native'

import { Card } from '@/components/Card'
import { Picker } from '@/components/Picker'
import { Row } from '@/components/Row'
import type { EditableProfile } from '../services/useUserProfile'
import type { User } from '@/types/entities'

/**
 * Scheduling preferences. These are the inputs CAPRI's auto-scheduler and LLM
 * prompts read, so they are not cosmetic — an empty work window produces a
 * noticeably worse plan.
 */

type Sheet = 'start' | 'end' | 'duration' | 'switching' | null

const HOURS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, '0')}:00`
  const display = new Date(2026, 0, 1, hour).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  })
  return { value, label: display }
})

const DURATIONS = [
  { value: 'quick', label: 'Quick wins' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'long', label: 'Deep work' },
] as const

const SWITCHING = [
  { value: 'low', label: 'Low — I prefer to stay on one thing' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High — I switch easily' },
] as const

const hourLabel = (value: string | undefined) =>
  HOURS.find((hour) => hour.value === value)?.label ?? 'Not set'

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

type PreferencesSectionProps = {
  readonly user: User | undefined
  readonly onChange: (changes: Partial<EditableProfile>) => void
}

export const PreferencesSection = ({ user, onChange }: PreferencesSectionProps) => {
  const [sheet, setSheet] = useState<Sheet>(null)
  const close = () => setSheet(null)

  // Read once so the JSX below stays a flat list of rows rather than a chain
  // of inline fallbacks (each `??` counted toward the complexity budget).
  const startsAt = user?.work_hours_start
  const endsAt = user?.work_hours_end
  const duration = user?.preferred_task_duration ?? 'mixed'
  const switching = user?.context_switch_tolerance ?? 'medium'

  return (
    <View>
      <Card flush>
        <Row
          label="Work starts"
          value={hourLabel(startsAt)}
          onPress={() => setSheet('start')}
        />
        <Row
          label="Work ends"
          value={hourLabel(endsAt)}
          onPress={() => setSheet('end')}
        />
        <Row
          label="Preferred task length"
          value={titleCase(duration)}
          onPress={() => setSheet('duration')}
        />
        <Row
          label="Context switching"
          value={titleCase(switching)}
          onPress={() => setSheet('switching')}
          last
        />
      </Card>

      <Picker
        open={sheet === 'start'}
        title="Work starts"
        value={startsAt}
        options={HOURS}
        onSelect={(work_hours_start) => onChange({ work_hours_start })}
        onClose={close}
      />
      <Picker
        open={sheet === 'end'}
        title="Work ends"
        value={endsAt}
        options={HOURS}
        onSelect={(work_hours_end) => onChange({ work_hours_end })}
        onClose={close}
      />
      <Picker
        open={sheet === 'duration'}
        title="Preferred task length"
        value={duration}
        options={DURATIONS}
        onSelect={(preferred_task_duration) => onChange({ preferred_task_duration })}
        onClose={close}
      />
      <Picker
        open={sheet === 'switching'}
        title="Context switching"
        value={switching}
        options={SWITCHING}
        onSelect={(context_switch_tolerance) => onChange({ context_switch_tolerance })}
        onClose={close}
      />
    </View>
  )
}
