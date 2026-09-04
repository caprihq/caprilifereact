import { useState } from 'react'
import { View } from 'react-native'

import { Card } from '@/components/Card'
import { Picker } from '@/components/Picker'
import { Row } from '@/components/Row'
import { HOURS, hourLabel } from '../logic/hours'
import { zoneLabel, zoneOptions } from '../logic/timeZones'
import type { EditableProfile } from '../services/useUserProfile'
import type { User } from '@/types/entities'

/**
 * Scheduling preferences. These are the inputs CAPRI's auto-scheduler and LLM
 * prompts read, so they are not cosmetic — an empty work window produces a
 * noticeably worse plan.
 */

type Sheet = 'start' | 'end' | 'duration' | 'switching' | 'timezone' | null

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
  /**
   * Every date rule in the app takes a zone, and until now it could only be read —
   * from the account or the device. Someone who travels, or whose device zone is
   * simply wrong, had no way to correct CAPRI's idea of "today".
   */
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezone = user?.timezone ?? deviceZone

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
        />
        <Row
          label="Time zone"
          value={zoneLabel(timezone)}
          onPress={() => setSheet('timezone')}
          last
        />
      </Card>

      <PreferencePickers
        sheet={sheet}
        onClose={close}
        onChange={onChange}
        values={{ startsAt, endsAt, duration, switching, timezone, deviceZone }}
        savedZone={user?.timezone}
      />
    </View>
  )
}

/** Every preference's picker. Split out to keep the row list readable (§3.2). */
const PreferencePickers = ({
  sheet,
  onClose,
  onChange,
  values,
  savedZone,
}: {
  readonly sheet: Sheet
  readonly onClose: () => void
  readonly onChange: (changes: Partial<EditableProfile>) => void
  readonly values: {
    readonly startsAt: string | undefined
    readonly endsAt: string | undefined
    readonly duration: 'quick' | 'mixed' | 'long'
    readonly switching: 'low' | 'medium' | 'high'
    readonly timezone: string
    readonly deviceZone: string
  }
  readonly savedZone: string | undefined
}) => (
  <>
      <Picker
        open={sheet === 'timezone'}
        title="Time zone"
        value={values.timezone}
        options={zoneOptions(values.deviceZone, savedZone)}
        onSelect={(zone) => onChange({ timezone: zone })}
        onClose={onClose}
      />
      <Picker
        open={sheet === 'start'}
        title="Work starts"
        value={values.startsAt}
        options={HOURS}
        onSelect={(work_hours_start) => onChange({ work_hours_start })}
        onClose={onClose}
      />
      <Picker
        open={sheet === 'end'}
        title="Work ends"
        value={values.endsAt}
        options={HOURS}
        onSelect={(work_hours_end) => onChange({ work_hours_end })}
        onClose={onClose}
      />
      <Picker
        open={sheet === 'duration'}
        title="Preferred task length"
        value={values.duration}
        options={DURATIONS}
        onSelect={(preferred_task_duration) => onChange({ preferred_task_duration })}
        onClose={onClose}
      />
      <Picker
        open={sheet === 'switching'}
        title="Context switching"
        value={values.switching}
        options={SWITCHING}
        onSelect={(context_switch_tolerance) => onChange({ context_switch_tolerance })}
        onClose={onClose}
      />
  </>
)

