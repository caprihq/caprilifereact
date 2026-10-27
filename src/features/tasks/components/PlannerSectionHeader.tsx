import { StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * The heading above a planner section: Morning, Afternoon, Evening, Needs attention.
 *
 * One component for every section so they line up. Before this each section drew
 * its own header as a single line of 15pt text with a bare 18pt glyph in front,
 * which read as a list item rather than as the divider between blocks of the day.
 * The icon now sits in a tinted disc, the title is a real heading with its hours
 * beneath it, and whatever a section needs on the right — a count, a plus — is
 * passed in as `trailing` so the left edge is identical everywhere.
 */

type PlannerSectionHeaderProps = {
  readonly icon: string
  readonly title: string
  readonly subtitle: string
  /** Colours the disc and glyph: the mood by default, amber for a warning. */
  readonly tone?: 'accent' | 'warning' | 'muted'
  readonly trailing?: ReactNode
}

export const PlannerSectionHeader = ({
  icon,
  title,
  subtitle,
  tone = 'accent',
  trailing,
}: PlannerSectionHeaderProps) => {
  const theme = useTheme()
  const ink =
    tone === 'warning'
      ? theme.colors.warning
      : tone === 'muted'
        ? theme.colors.textMuted
        : theme.colors.accentInk
  const disc = tone === 'accent' ? theme.colors.accentTint : theme.colors.fill

  return (
    <View style={[styles.row, { gap: theme.spacing.md, paddingHorizontal: theme.spacing.xs }]}>
      <View style={[styles.disc, { backgroundColor: disc, borderRadius: theme.radius.full }]}>
        <Ionicons name={icon} size={18} color={ink} />
      </View>

      <View style={styles.titles}>
        <Text variant="heading" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {trailing}
    </View>
  )
}

/** "2 items" in a quiet pill, so the count reads as a badge and not as more copy. */
export const CountPill = ({ label }: { readonly label: string }) => {
  const theme = useTheme()
  return (
    <View
      style={{
        backgroundColor: theme.colors.fill,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      }}
    >
      <Text variant="label" tone="secondary">
        {label}
      </Text>
    </View>
  )
}

/** Disc and control share one size so the header's left and right edges match. */
export const HEADER_DISC = 36

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  disc: {
    width: HEADER_DISC,
    height: HEADER_DISC,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 2 },
})
