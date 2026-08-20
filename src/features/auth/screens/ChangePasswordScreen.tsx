import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { size } from '@/theme'
import { useChangePassword } from '../hooks/useChangePassword'

/**
 * Change the password of the signed-in user.
 *
 * Lives in the **auth** feature although Profile navigates to it: it is an auth
 * operation, and housing it in profile would make profile own auth logic.
 *
 * `changePassword` had existed in the SDK with no caller — there was no way to
 * change a password from inside the app at all.
 */
export const ChangePasswordScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation()
  const form = useChangePassword(() => navigation.goBack())

  return (
    <KeyboardAwareScroll
      align="top"
      contentStyle={[wash, { padding: size.screenPadding, gap: theme.spacing.lg }]}
    >
      <Text variant="body" tone="secondary">
        Enter your current password, then choose a new one.
      </Text>

      <TextField
        label="Current password"
        showLabel
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={form.current}
        onChangeText={form.setCurrent}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
      />

      <TextField
        label="New password"
        showLabel
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={form.next}
        onChangeText={form.setNext}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />

      <TextField
        label="Confirm new password"
        showLabel
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={form.confirm}
        onChangeText={form.setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void form.submit()}
      />

      <FormError message={form.error} />

      <View style={{ marginTop: theme.spacing.lg }}>
        <Button label="Change password" onPress={() => void form.submit()} loading={form.busy} />
      </View>
    </KeyboardAwareScroll>
  )
}
