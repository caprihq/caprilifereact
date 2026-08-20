import { renderHook } from '@testing-library/react-native'

import { useWash } from './useWash'

/**
 * The wash's crash guard.
 *
 * `experimental_backgroundImage` builds its gradient from the painted view's own
 * measured size, and at 0×0 the gradient's endpoints coincide — Android's
 * `LinearGradient.nativeCreate` then throws `IllegalArgumentException` on the UI
 * thread and the process dies outright, with no JS error to catch. It happened
 * twice on device while this was being wired up.
 *
 * So the floor below is load-bearing. It looks like a stray layout tweak and reads
 * as removable; it is the difference between a screen that measures at zero for one
 * frame and an app that terminates.
 */

describe('useWash', () => {
  it('never lets the painted view reach zero size', async () => {
    const { result } = await renderHook(() => useWash())

    expect(result.current.minWidth).toBe(1)
    expect(result.current.minHeight).toBe(1)
  })

  it('paints a gradient over a solid fallback', async () => {
    const { result } = await renderHook(() => useWash())

    // The solid colour stays underneath: the gradient prop is still experimental
    // upstream, and without it a platform that ignores it leaves a transparent hole.
    expect(result.current.backgroundColor).toMatch(/^#/)

    // The prop is typed as `string | BackgroundImageValue`, so narrow before reading.
    const image = result.current.experimental_backgroundImage
    const [gradient] = Array.isArray(image) ? image : []
    if (typeof gradient !== 'object') throw new Error('no gradient was produced')

    expect(gradient.type).toBe('linear-gradient')
    // Three stops span the page instead of fading out by mid-screen.
    expect(gradient.colorStops).toHaveLength(3)
  })
})
