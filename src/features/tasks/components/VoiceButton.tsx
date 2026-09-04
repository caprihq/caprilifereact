import { useEffect, useMemo } from 'react'
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { useTheme } from '@/hooks/useTheme'

/**
 * The mic.
 *
 * Two sizes: `hero` is the centrepiece of the capture screen, the way the web client
 * leads with it — voice is the fastest way into a task and the screen should say so
 * before the keyboard does. `inline` is the small version for a row.
 *
 * While listening it does two things at once: the button breathes, and a halo ring
 * expands out of it and fades. A recognizer takes several seconds over a sentence,
 * and a static button in that window reads as one that did nothing — the ring is
 * what makes "the microphone is open" legible from across a room. Both run on the
 * native driver, so a busy JS thread cannot stall them.
 */

type VoiceButtonProps = {
  readonly listening: boolean
  readonly onPress: () => void
  readonly disabled?: boolean
  readonly variant?: 'hero' | 'inline'
}

const DIAMETER = { hero: 116, inline: size.tapTarget } as const
/** How far the ring stands off the button. Enough to read as a halo, not a border. */
const RING_GAP = 12

export const VoiceButton = ({
  listening,
  onPress,
  disabled = false,
  variant = 'inline',
}: VoiceButtonProps) => {
  const theme = useTheme()
  const diameter = DIAMETER[variant]
  const pulse = useMemo(() => new Animated.Value(0), [])

  useEffect(() => {
    if (!listening) {
      pulse.setValue(0)
      return
    }

    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    )
    loop.start()

    return () => {
      loop.stop()
    }
  }, [listening, pulse])

  return (
    <View style={styles.stack}>
      <Rings diameter={diameter} listening={listening} variant={variant} pulse={pulse} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop recording' : 'Capture task by voice'}
        accessibilityState={{ disabled, busy: listening }}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          variant === 'hero' ? theme.elevation.high : null,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: listening ? theme.colors.danger : theme.colors.accent,
            opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <Ionicons
          name={listening ? 'stop' : 'mic'}
          size={variant === 'hero' ? 52 : 22}
          color={theme.colors.textOnAccent}
        />
      </Pressable>
    </View>
  )
}

/**
 * What surrounds the mic: a standing ring, and a pulse while recording.
 *
 * The standing ring gives the button something to sit inside, so it reads as the
 * screen's one action rather than a floating dot. The pulse only exists while the
 * recognizer is live — a sentence takes several seconds, and a static button in that
 * window looks like one that did nothing.
 */
const Rings = ({
  diameter,
  listening,
  variant,
  pulse,
}: {
  readonly diameter: number
  readonly listening: boolean
  readonly variant: 'hero' | 'inline'
  readonly pulse: Animated.Value
}) => {
  const theme = useTheme()
  const ringSize = diameter + RING_GAP * 2

  return (
    <>
      {variant === 'hero' ? (
        <View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: 2,
              borderColor: listening ? theme.colors.danger : theme.colors.accent,
              opacity: 0.35,
            },
          ]}
        />
      ) : null}

      {listening ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: theme.colors.danger,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
              ],
            },
          ]}
        />
      ) : null}
    </>
  )
}


const styles = StyleSheet.create({
  stack: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  button: { alignItems: 'center', justifyContent: 'center' },
})
