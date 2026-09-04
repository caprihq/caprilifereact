import { gradient } from './gradient'

/**
 * The regression this file exists for: switching light/dark on Android killed the
 * process outright.
 *
 * A corner keyword makes RN resolve the angle as `atan(width / height)`. A view
 * drawn at 0×0 — every view for one frame after a theme change — turns that into
 * `NaN`, Skia rejects the non-finite gradient line, and the JNI throws a
 * message-less `IllegalArgumentException` on the UI thread. Emitting an angle skips
 * that division entirely.
 */

type Stop = { readonly color: string }
type Layer = { readonly type: string; readonly direction: string; readonly colorStops: Stop[] }

const layerOf = (style: ReturnType<typeof gradient>): Layer =>
  (style.experimental_backgroundImage as unknown as Layer[])[0] as Layer

describe('gradient', () => {
  it('never emits a direction keyword, only an angle', () => {
    // A keyword divides by the view's height. At 0×0 that is 0/0 → NaN → crash.
    for (const direction of ['to bottom', 'to bottom right'] as const) {
      expect(layerOf(gradient(['#000000', '#ffffff'], direction)).direction).toMatch(
        /^-?\d+(\.\d+)?deg$/,
      )
    }
  })

  it('maps each direction to its CSS equivalent', () => {
    expect(layerOf(gradient(['#000000', '#ffffff'])).direction).toBe('180deg')
    // 135deg is `to bottom right` for a square, which is what the swatch dots are.
    expect(layerOf(gradient(['#000000', '#ffffff'], 'to bottom right')).direction).toBe('135deg')
  })

  it('keeps a one-pixel floor so the gradient line always has length', () => {
    const style = gradient(['#000000', '#ffffff'])

    expect(style.minWidth).toBe(1)
    expect(style.minHeight).toBe(1)
  })

  it('passes the stops through in order', () => {
    const stops = ['#11223344', '#556677', '#8899aa00']

    expect(layerOf(gradient(stops)).colorStops).toEqual(stops.map((color) => ({ color })))
  })

  it('defaults to top-down', () => {
    expect(layerOf(gradient(['#000000', '#ffffff'])).direction).toBe('180deg')
  })
})
