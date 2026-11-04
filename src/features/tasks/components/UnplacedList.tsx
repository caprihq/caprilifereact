import { View } from 'react-native'

import { Card } from '@/components/Card'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Task } from '@/types/entities'
import { unplacedHeading, unplacedLine } from '../logic/unplacedReason'
import type { PlanScope } from '../logic/unplacedReason'
import type { Unplaced } from '../logic/unplacedReason'

/**
 * What CAPRI could not fit, and why.
 *
 * Without this the screen showed four suggestions and said nothing about the other
 * eight tasks. Nobody reads that as "the week is full" — they read it as the feature
 * being broken, or assume the rest were scheduled somewhere they cannot see.
 *
 * Deliberately quiet: muted text, no red, no icon. Nothing has gone wrong. A full
 * week is a fact about the week, and the reason on each row is what makes it
 * actionable — shorten the task, move the deadline, or accept it.
 */

type UnplacedListProps = {
  readonly unplaced: readonly Unplaced[]
  /** Every task, so an id can be shown as the name the user gave it. */
  readonly tasks: readonly Task[]
  readonly scope: PlanScope
  /**
   * Look for time on later days. Offered only after a plan for today: future days
   * are optional, for when today is full, never the default.
   */
  readonly onPlanAhead?: (() => void) | undefined
}

export const UnplacedList = ({ unplaced, tasks, scope, onPlanAhead }: UnplacedListProps) => {
  const theme = useTheme()
  if (unplaced.length === 0) return null

  return (
    <View>
      <SectionLabel>{unplacedHeading(unplaced.length, scope)}</SectionLabel>
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="caption" tone="muted">
            Still on your list, ranked as usual.
          </Text>
          {unplaced.map((entry) => {
            const task = tasks.find((candidate) => candidate.id === entry.task_id)

            return (
              <View key={entry.task_id} style={{ gap: 2 }}>
                {/*
                  A task missing from the local list is one finished or deleted on
                  another device since the plan was built. Naming it "A task" is
                  better than dropping the row: the count above already said how many
                  there were, and a list one shorter than its own heading is worse
                  than a vague name.
                */}
                <Text variant="bodyStrong" numberOfLines={1}>
                  {task?.title ?? 'A task'}
                </Text>
                <Text variant="caption" tone="muted">
                  {unplacedLine(entry)}
                </Text>
              </View>
            )
          })}

          {scope === 'today' && onPlanAhead ? (
            <Button
              label="Find time later this week"
              variant="secondary"
              onPress={onPlanAhead}
            />
          ) : null}
        </View>
      </Card>
    </View>
  )
}
