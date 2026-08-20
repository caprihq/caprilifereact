import { useCallback, useMemo } from 'react'
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * Swipe-left row revealing Later and Cancel, matching the web client's
 * SwipeableTaskRow.
 *
 * **Built on RN's own `Animated` and `PanResponder`, deliberately.** This used
 * Reanimated with gesture-handler, which tracked the finger on the UI thread and
 * was genuinely smoother — but Reanimated registers a `MountingOverrideDelegate`
 * on the shadow tree, so it sits inside the mount path of *every* Fabric commit,
 * and that path was crashing:
 *
 *     signal 11 (SIGSEGV), fault addr 0x0 in tid mqt_v_js
 *       #00 pc 0
 *       #01 MountingCoordinator::pullTransaction(bool) const+524
 *
 * A call through a dead function pointer, taking the whole process with it. The
 * bigger the commit the likelier it was, so it fired most often on exactly the
 * interactions a user makes deliberately — picking a theme colour, or popping a
 * screen — which is why it read as "the app crashes when I change the colour" and
 * "back closes the app" rather than as one bug. Lazy-loading the signed-in stack
 * had kept it away from the login screen, but that only delayed it until sign-in.
 *
 * There is no way to keep the library and be sure: the fault is in its native C++,
 * the fix would need a version that isn't available offline, and every commit in
 * the app goes through the affected path. One row's drag animation is not worth a
 * process-level crash, so the dependency is gone.
 *
 * The trade is real and small: the drag now runs on the JS thread. The release
 * spring still animates natively (`useNativeDriver`), and a task row is a short,
 * cheap subtree, so the drag holds up. If Reanimated is ever reinstated, this
 * component is the only thing that needs to change back — and the crash above is
 * what to test for first.
 */

const ACTION_WIDTH = 160
/** Past this, releasing opens rather than snapping shut. */
const OPEN_THRESHOLD = 80
/** A little travel past the actions, so the row has some give at the end. */
const RUBBER_BAND = 20
/** Horizontal movement before the row takes the gesture from the list's scroll. */
const CLAIM_GESTURE = 12

/**
 * Where the row settles when the finger lifts.
 *
 * Pure and exported so the rule is testable without a gesture: the open/shut
 * decision is the whole behaviour, and it is easy to get backwards.
 */
export const settleTarget = (offset: number, dx: number): number =>
  offset + dx < -OPEN_THRESHOLD ? -ACTION_WIDTH : 0

/** Clamp to "left only", with a rubber band at the far end. */
export const clampDrag = (offset: number, dx: number): number =>
  Math.min(0, Math.max(-ACTION_WIDTH - RUBBER_BAND, offset + dx))

/** The row's resting position, held outside React so a drag never re-renders. */
type Resting = { offset: number }

/**
 * The gesture, built outside the component so its body stays readable.
 *
 * `resting.offset` is read when the finger moves rather than when this is created,
 * which is why a mutable box is the right shape here: a state variable would make
 * every frame of a drag a re-render.
 */
const createResponder = ({
  resting,
  translateX,
  settle,
}: {
  readonly resting: Resting
  readonly translateX: Animated.Value
  readonly settle: (to: number) => void
}) =>
  PanResponder.create({
    // Only claim a clearly horizontal drag, or the row steals the list's scroll.
    onMoveShouldSetPanResponder: (_event, gesture) =>
      Math.abs(gesture.dx) > CLAIM_GESTURE && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_event, gesture) => {
      translateX.setValue(clampDrag(resting.offset, gesture.dx))
    },
    onPanResponderRelease: (_event, gesture) => {
      settle(settleTarget(resting.offset, gesture.dx))
    },
    // A cancelled gesture must not leave the row stranded mid-swipe.
    onPanResponderTerminate: () => settle(resting.offset),
  })

type SwipeableTaskRowProps = {
  readonly children: ReactNode
  readonly onComplete: () => void
  readonly onDefer: () => void
  readonly onCancel: () => void
  readonly onPress?: (() => void) | undefined
  readonly completed?: boolean
}

export const SwipeableTaskRow = ({
  children,
  onComplete,
  onDefer,
  onCancel,
  onPress,
  completed = false,
}: SwipeableTaskRowProps) => {
  const theme = useTheme()
  const translateX = useMemo(() => new Animated.Value(0), [])
  /** Where the row rests between gestures: 0 shut, -ACTION_WIDTH open. */
  const resting = useMemo<Resting>(() => ({ offset: 0 }), [])

  const settle = useCallback(
    (to: number) => {
      // Writing to the box is the point of it: the resting position has to survive
      // between gestures without turning each frame of a drag into a render.
      // eslint-disable-next-line react-hooks/immutability
      resting.offset = to
      Animated.spring(translateX, {
        toValue: to,
        useNativeDriver: true,
        damping: 30,
        stiffness: 300,
        mass: 1,
      }).start()
    },
    [resting, translateX],
  )

  const runAction = useCallback(
    (action: () => void) => {
      settle(0)
      action()
    },
    [settle],
  )

  const handlePress = useCallback(() => {
    // An open row swallows the first tap to close itself, which is what every
    // other swipe-to-reveal list does.
    if (resting.offset !== 0) {
      settle(0)
      return
    }
    onPress?.()
  }, [onPress, resting, settle])

  const responder = useMemo(
    () => createResponder({ resting, translateX, settle }),
    [resting, settle, translateX],
  )

  return (
    <View style={[styles.root, { borderRadius: theme.radius.xl }]}>
      <View style={[styles.actions, { width: ACTION_WIDTH }]}>
        <SwipeAction
          label="Later"
          icon="bookmark"
          background={theme.colors.warning}
          onPress={() => runAction(onDefer)}
        />
        <SwipeAction
          label="Cancel"
          icon="close"
          background={theme.colors.textMuted}
          onPress={() => runAction(onCancel)}
        />
      </View>

      <Animated.View
        style={[{ backgroundColor: theme.colors.surface }, { transform: [{ translateX }] }]}
        {...responder.panHandlers}
      >
        <Pressable
          onPress={handlePress}
          style={[styles.content, { padding: theme.spacing.lg, gap: theme.spacing.md }]}
        >
          <Ionicons
            name={completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={completed ? theme.colors.accentInk : theme.colors.textMuted}
            onPress={onComplete}
            suppressHighlighting
          />
          <View style={styles.flex}>{children}</View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

type SwipeActionProps = {
  readonly label: string
  readonly icon: 'bookmark' | 'close'
  readonly background: string
  readonly onPress: () => void
}

const SwipeAction = ({ label, icon, background, onPress }: SwipeActionProps) => (
  <View style={[styles.action, { backgroundColor: background }]} onTouchEnd={onPress}>
    <Ionicons name={icon} size={18} color="#FFFFFF" />
    <Text variant="caption" tone="onAccent">
      {label}
    </Text>
  </View>
)

const styles = StyleSheet.create({
  // Clips the sliding surface at the row's own edges. This is the one place the
  // app still clips, and it is the same Android hazard `Card` documents — if task
  // rows ever come up blank after a re-render, this is the first thing to try.
  root: { overflow: 'hidden' },
  // Pinned to the right edge, revealed as the surface slides left.
  actions: { position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row' },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  content: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
})
