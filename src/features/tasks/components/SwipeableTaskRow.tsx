import { useCallback, useMemo } from 'react'
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { inkOn } from '@/theme/moods'

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
    /**
     * Claimed in the **capture** phase, so a child that is itself pressable cannot
     * swallow the swipe.
     *
     * Without this the row only saw gestures that began on its own background: a
     * card with a `Pressable` root took the responder on touch-down and kept it, so
     * every swipe registered as a tap and Later/Cancel were unreachable — the whole
     * card just opened the task.
     *
     * Still only a clearly horizontal drag, or the row steals the list's scroll.
     */
    onMoveShouldSetPanResponderCapture: (_event, gesture) =>
      Math.abs(gesture.dx) > CLAIM_GESTURE && Math.abs(gesture.dx) > Math.abs(gesture.dy),
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
  /**
   * The child is a whole card and owns its own surface, padding and completion
   * control. Mirrors the web client's `hideCheckbox`, and additionally drops this
   * row's padding and background — without that a card renders inside a second
   * surface, with two circles to tap and a square edge behind its rounded one.
   */
  readonly flush?: boolean
}

export const SwipeableTaskRow = ({
  children,
  onComplete,
  onDefer,
  onCancel,
  onPress,
  completed = false,
  flush = false,
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
          icon="close-circle"
          // Destructive, and coloured as such: Cancel used to wear the muted grey
          // of disabled text, which reads as the inert half of the pair rather
          // than the one that throws work away.
          background={theme.colors.danger}
          onPress={() => runAction(onCancel)}
        />
      </View>

      <Animated.View
        // Always opaque, even in flush mode: a transparent sliding surface lets the
        // actions behind it show through at rest, so every row looked permanently
        // half-swiped.
        style={[{ backgroundColor: theme.colors.surface }, { transform: [{ translateX }] }]}
        {...responder.panHandlers}
      >
        <RowContent
          flush={flush}
          completed={completed}
          onPress={handlePress}
          onComplete={onComplete}
        >
          {children}
        </RowContent>
      </Animated.View>
    </View>
  )
}

/**
 * What sits on top of the swipe actions.
 *
 * Extracted to keep the gesture component inside the 80-line body limit (§3.2); it
 * is layout only, and the gesture maths above is the part worth reading.
 */
const RowContent = ({
  flush,
  completed,
  onPress,
  onComplete,
  children,
}: {
  readonly flush: boolean
  readonly completed: boolean
  readonly onPress: () => void
  readonly onComplete: () => void
  readonly children: ReactNode
}) => {
  const theme = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={[styles.content, flush ? null : { padding: theme.spacing.lg, gap: theme.spacing.md }]}
    >
      {flush ? null : (
        <Ionicons
          name={completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={completed ? theme.colors.accentInk : theme.colors.textMuted}
          onPress={onComplete}
          suppressHighlighting
        />
      )}
      <View style={styles.flex}>{children}</View>
    </Pressable>
  )
}

type SwipeActionProps = {
  readonly label: string
  readonly icon: 'bookmark' | 'close-circle'
  readonly background: string
  readonly onPress: () => void
}

const SwipeAction = ({ label, icon, background, onPress }: SwipeActionProps) => (
  <View style={[styles.action, { backgroundColor: background }]} onTouchEnd={onPress}>
    {/* Ink chosen against the fill rather than assumed white: "Later" is amber, and
        white on amber is the one pairing in this palette that fails to read. */}
    <Ionicons name={icon} size={20} color={inkOn(background)} />
    <Text variant="caption" style={{ color: inkOn(background) }}>
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
