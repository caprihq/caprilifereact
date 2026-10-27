import { coalesce } from './coalesce'

const deferred = () => {
  const handle: { resolve: () => void } = { resolve: () => undefined }
  const promise = new Promise<void>((resolve) => {
    handle.resolve = resolve
  })
  return { promise, resolve: () => handle.resolve() }
}

describe('coalesce', () => {
  it('never runs the job twice at once, and runs once more for calls made meanwhile', async () => {
    const gates = [deferred(), deferred()]
    const started = { count: 0 }
    const job = jest.fn((): Promise<void> => {
      const gate = gates[started.count]
      started.count += 1
      return gate?.promise ?? Promise.resolve()
    })
    const run = coalesce(job)

    const first = run()
    void run()
    void run()
    expect(job).toHaveBeenCalledTimes(1)

    gates[0]?.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(job).toHaveBeenCalledTimes(2)

    gates[1]?.resolve()
    await first
    expect(job).toHaveBeenCalledTimes(2)
  })

  it('starts fresh once the previous run has finished', async () => {
    const job = jest.fn(() => Promise.resolve())
    const run = coalesce(job)
    await run()
    await run()
    expect(job).toHaveBeenCalledTimes(2)
  })
})
