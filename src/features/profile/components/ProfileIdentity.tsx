import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { User } from '@/types/entities'

/** Display name and email, with inline rename. */
export const ProfileIdentity = ({
  user,
  onRename,
}: {
  readonly user: User | undefined
  readonly onRename: (name: string) => void
}) => {
  const theme = useTheme()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  const current = user?.display_name ?? user?.full_name ?? 'Your account'

  if (editing) {
    return (
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <TextField
            label="Display name"
            placeholder="Display name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Button
            label="Save"
            onPress={() => {
              if (name.trim()) onRename(name.trim())
              setEditing(false)
            }}
          />
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
        </View>
      </Card>
    )
  }

  return (
    <Card
      onPress={() => {
        setName(user?.display_name ?? user?.full_name ?? '')
        setEditing(true)
      }}
      accessibilityLabel="Edit display name"
    >
      <Text variant="title">{current}</Text>
      <Text variant="caption" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        {user?.email ?? ''}
      </Text>
      <Text variant="caption" tone="accent" style={{ marginTop: theme.spacing.sm }}>
        Edit
      </Text>
    </Card>
  )
}
