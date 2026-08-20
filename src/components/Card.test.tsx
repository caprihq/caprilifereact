import { Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'

import { Card } from './Card'

/**
 * Why a card must never clip.
 *
 * A flush card set `overflow: 'hidden'` to cut the corners of the rows it hosts.
 * On Android that quietly breaks: the children paint on first mount and then
 * **disappear** on any later update, leaving a card of the correct height with
 * nothing inside it. It stayed hidden while the theme lived in Unistyles, which
 * changed colours natively without re-rendering — the moment picking a colour
 * became a React update, every settings list on the Profile screen emptied itself.
 *
 * The clip is not needed: `Row` dims rather than fills when pressed, so nothing
 * inside paints a square corner over a round one. This test states that, because
 * `overflow: 'hidden'` is exactly the kind of line someone re-adds to "fix" a
 * corner and the damage does not show up until a second render.
 */

/** The flattened style of the outermost rendered view. */
const rootStyle = (): Record<string, unknown> => {
  type Json = { props: Record<string, unknown> }
  const node = screen.toJSON() as Json | readonly Json[] | null
  const root = Array.isArray(node) ? node[0] : node
  if (!root) throw new Error('nothing was rendered')

  const flatten = (value: unknown): Record<string, unknown> =>
    Array.isArray(value)
      ? value.reduce<Record<string, unknown>>((acc, item) => ({ ...acc, ...flatten(item) }), {})
      : ((value ?? {}) as Record<string, unknown>)

  return flatten(root.props.style)
}

describe('Card', () => {
  it('does not clip a flush card, whose children Android would then drop', async () => {
    await render(
      <Card flush>
        <Text>row</Text>
      </Card>,
    )

    expect(rootStyle().overflow).not.toBe('hidden')
  })

  it('keeps hosting its children after a re-render', async () => {
    // The failure mode in miniature: mount, update, and the rows must still be here.
    const view = await render(
      <Card flush>
        <Text>row</Text>
      </Card>,
    )

    // `rerender` is async in RTL v14, and awaiting it is what makes this a real
    // second commit rather than a queued one.
    await view.rerender(
      <Card flush>
        <Text>row</Text>
      </Card>,
    )

    expect(screen.getByText('row')).toBeTruthy()
    expect(rootStyle().overflow).not.toBe('hidden')
  })
})
