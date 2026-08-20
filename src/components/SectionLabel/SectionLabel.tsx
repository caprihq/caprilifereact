import type { ReactNode } from 'react'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/** Small heading above each Home section ("Start Here", "Up Next"). */
export const SectionLabel = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme()
  return (
    <Text variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
      {children}
    </Text>
  )
}
