import { PAGE_SIZE, allPages } from './filterAll'

const rows = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `r${String(from + index)}` }))

describe('allPages', () => {
  it('stops after one request when everything fits', async () => {
    const page = jest.fn(() => Promise.resolve(rows(0, 3)))
    expect(await allPages(page)).toHaveLength(3)
    expect(page).toHaveBeenCalledTimes(1)
    expect(page).toHaveBeenCalledWith(PAGE_SIZE, 0)
  })

  it('keeps reading while pages come back full', async () => {
    const page = jest.fn((_limit: number, skip: number) =>
      Promise.resolve(skip === 0 ? rows(0, PAGE_SIZE) : rows(PAGE_SIZE, 2)),
    )
    expect(await allPages(page)).toHaveLength(PAGE_SIZE + 2)
    expect(page).toHaveBeenLastCalledWith(PAGE_SIZE, PAGE_SIZE)
  })

  it('drops a row repeated across two pages', async () => {
    const page = jest.fn((_limit: number, skip: number) =>
      Promise.resolve(skip === 0 ? rows(0, PAGE_SIZE) : rows(PAGE_SIZE - 1, 2)),
    )
    expect(await allPages(page)).toHaveLength(PAGE_SIZE + 1)
  })
})
