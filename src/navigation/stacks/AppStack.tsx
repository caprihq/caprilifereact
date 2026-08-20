import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AdminScreen } from '@/features/admin'
import { ChangePasswordScreen } from '@/features/auth'
import { AddCommitmentScreen } from '@/features/commitments'
import { PlanScreen, PrivacyScreen, SupportScreen } from '@/features/profile'
import { AddTaskScreen, PlannerScreen, TaskDetailScreen } from '@/features/tasks'
import { useTheme } from '@/hooks/useTheme'
import { buildHeaderOptions } from '../navigationTheme'
import { gestureOptions, pushAnimation, sheetOptions } from '../screenOptions'
import { HomeTabs } from '../tabs/HomeTabs'
import type { AppStackParamList } from '../types'

const Stack = createNativeStackNavigator<AppStackParamList>()

/**
 * Signed-in stack: the tabs, plus everything pushed over them.
 *
 * Capture and detail present as real UIKit sheets; settings screens push, so
 * they get the native header and back-swipe.
 *
 * This navigator used to declare no options at all, which meant the stack users
 * actually live in ran on bare defaults while the sign-in stack — visited once —
 * was fully configured.
 */
export const AppStack = () => {
  const theme = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{ ...gestureOptions, ...pushAnimation, ...buildHeaderOptions(theme) }}
    >
      <Stack.Screen name="Tabs" component={HomeTabs} options={{ headerShown: false }} />

      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{ ...sheetOptions, title: 'New task' }}
      />
      <Stack.Screen
        name="AddCommitment"
        component={AddCommitmentScreen}
        options={{ ...sheetOptions, title: 'Block out time' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ ...sheetOptions, title: 'Task' }}
      />

      <Stack.Screen name="Planner" component={PlannerScreen} options={{ title: 'Daily Planner' }} />
      <Stack.Screen name="Plan" component={PlanScreen} options={{ title: 'Plan' }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Contact support' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
      <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Push console' }} />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change password' }}
      />
    </Stack.Navigator>
  )
}
