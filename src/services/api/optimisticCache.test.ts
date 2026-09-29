import { QueryClient } from '@tanstack/react-query'

import { optimisticList, restoreList } from './optimisticCache'

type Row = { readonly id: string }

const KEY = ['rows'] as const

const clientWith = (rows: readonly Row[] | undefined): QueryClient => {
  const client = new QueryClient()
  if (rows) client.setQueryData(KEY, rows)
  return client
}

describe('optimisticList', () => {
  it('applies the change to the cache straight away', async () => {
    const client = clientWith([{ id: 'a' }])

    await optimisticList<Row>(client, KEY, (rows) => [...rows, { id: 'b' }])

    expect(client.getQueryData(KEY)).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('hands back the list as it was, for the rollback', async () => {
    const client = clientWith([{ id: 'a' }])

    const snapshot = await optimisticList<Row>(client, KEY, () => [])

    expect(snapshot.previous).toEqual([{ id: 'a' }])
  })

  it('treats an empty cache as an empty list rather than undefined', async () => {
    // A create on first load must still show the new row; `update` receiving
    // undefined would throw inside every caller's spread.
    const client = clientWith(undefined)

    await optimisticList<Row>(client, KEY, (rows) => [...rows, { id: 'b' }])

    expect(client.getQueryData(KEY)).toEqual([{ id: 'b' }])
  })

  it('reports no snapshot when there was nothing cached', async () => {
    const snapshot = await optimisticList<Row>(clientWith(undefined), KEY, (rows) => rows)

    expect(snapshot.previous).toBeUndefined()
  })
})

describe('restoreList', () => {
  it('puts the previous list back', () => {
    const client = clientWith([{ id: 'optimistic' }])

    restoreList(client, KEY, { previous: [{ id: 'a' }] })

    expect(client.getQueryData(KEY)).toEqual([{ id: 'a' }])
  })

  it('leaves the cache alone when there is no snapshot', () => {
    // Nothing was cached before the mutation, so there is no "as it was" to
    // return to; blanking the list here would delete a fetch that has since won.
    const client = clientWith([{ id: 'fetched' }])

    restoreList(client, KEY, { previous: undefined })
    restoreList(client, KEY, undefined)

    expect(client.getQueryData(KEY)).toEqual([{ id: 'fetched' }])
  })
})
