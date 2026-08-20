import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { StyleSheet, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { base44 } from '@/services/api'
import { reportError } from '@/services'
import { useCurrentUser } from '@/services/api'

/** Contact support — posts to the sendSupportEmail backend function. */
export const SupportScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation()
  const { show } = useFeedback()
  const { data: user } = useCurrentUser()

  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = useCallback(async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await base44.functions.invoke('sendSupportEmail', {
        message: message.trim(),
        user_name: user?.display_name ?? user?.full_name ?? '',
        user_email: user?.email ?? '',
      })
      show({ message: 'Message sent — we will get back to you.' })
      navigation.goBack()
    } catch (error) {
      reportError(error, 'sendSupportEmail')
      show({ message: "Couldn't send that. Please try again.", isError: true })
    } finally {
      setSending(false)
    }
  }, [message, user, show, navigation])

  return (
    <View style={[styles.fill, wash]}>
      <KeyboardAwareScroll
        align="top"
        contentStyle={{ padding: size.screenPadding, gap: theme.spacing.lg }}
      >
        <Text variant="body" tone="secondary">
          Describe your issue or share feedback and we&apos;ll get back to you.
        </Text>

        <TextInput
          accessibilityLabel="Your message"
          multiline
          value={message}
          onChangeText={setMessage}
          placeholder="What's going on?"
          placeholderTextColor={theme.colors.textMuted}
          style={{
            minHeight: 160,
            textAlignVertical: 'top',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.md,
          }}
        />

        <View>
          <Button
            label="Send message"
            onPress={() => void send()}
            loading={sending}
            disabled={!message.trim()}
          />
        </View>
      </KeyboardAwareScroll>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
