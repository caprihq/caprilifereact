import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * What the app evaluates before it can render.
 *
 * A single `import { pruneSignals } from '@/features/tasks'` — one pure function
 * — pulled the feature barrel, and through it four screens, `SwipeableTaskRow`
 * and **react-native-reanimated**, into the login screen's first render. Nothing
 * in the type system or the lint config objects to that: a barrel makes the whole
 * feature look free.
 *
 * It is not free. Reanimated installed a Fabric commit hook and registered a
 * `MountingOverrideDelegate` on the shadow tree, which put it inside the mount
 * path of every commit — and that path was crashing outright:
 * `SIGSEGV, fault addr 0x0` in `MountingCoordinator::pullTransaction`, a call
 * through a dead function pointer. Keeping it off the login screen only delayed
 * that until sign-in, so **the dependency was removed** rather than deferred; see
 * `SwipeableTaskRow`.
 *
 * The rule below therefore checks the stronger thing now — that it is not
 * installed at all — while the graph walk stays, because the barrel problem it
 * caught is still real for everything else.
 */

const SRC = resolve(__dirname)

/** Native libraries removed for stability, which must not come back unnoticed. */
const REMOVED = ['react-native-reanimated', 'react-native-worklets']

const resolveImport = (spec: string, from: string): string | null => {
  const base = spec.startsWith('@/')
    ? join(SRC, spec.slice(2))
    : spec.startsWith('.')
      ? resolve(dirname(from), spec)
      : null
  if (base === null) return null

  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Every module reachable from `entry`, plus the first path found to each bare package. */
const walk = (entry: string) => {
  const seen = new Set([entry])
  const parents = new Map<string, string>()
  const packageHits = new Map<string, string>()
  const queue = [entry]

  while (queue.length > 0) {
    const file = queue.shift()
    if (file === undefined) break
    const source = readFileSync(file, 'utf8')

    for (const match of source.matchAll(/from '([^']+)'/g)) {
      const spec = match[1]
      if (spec === undefined) continue

      const resolved = resolveImport(spec, file)
      if (resolved === null) {
        // A bare package. Record where it entered the graph.
        if (!packageHits.has(spec)) packageHits.set(spec, file)
        continue
      }
      if (!seen.has(resolved)) {
        seen.add(resolved)
        parents.set(resolved, file)
        queue.push(resolved)
      }
    }
  }
  return { seen, parents, packageHits }
}

/** Readable chain from the entry point to whatever pulled in `pkg`. */
const chainTo = (pkg: string, graph: ReturnType<typeof walk>): string => {
  const steps = [pkg]
  let current = graph.packageHits.get(pkg)
  while (current !== undefined) {
    steps.push(current.replace(`${SRC}/`, ''))
    current = graph.parents.get(current)
  }
  return steps.reverse().join('\n  → ')
}

describe('startup import graph', () => {
  const graph = walk(join(SRC, 'App.tsx'))

  it('can see the graph at all — a broken walk must not pass silently', () => {
    expect(graph.seen.size).toBeGreaterThan(50)
    expect(graph.packageHits.has('react-native')).toBe(true)
  })

  it.each(REMOVED)('does not depend on %s anywhere', (pkg) => {
    // Removed because its native mounting delegate crashed the process inside
    // `MountingCoordinator::pullTransaction`. Reinstating it means owning that
    // crash again, so it should be a deliberate decision with a version bump and
    // a soak test — not a transitive reappearance.
    const manifest = JSON.parse(
      readFileSync(resolve(SRC, '..', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }

    expect(Object.keys(manifest.dependencies ?? {})).not.toContain(pkg)
    expect(Object.keys(manifest.devDependencies ?? {})).not.toContain(pkg)

    // And nothing reaches for it in source either — with the chain printed, so a
    // reappearance names whoever pulled it back in.
    const reached = graph.packageHits.has(pkg) ? `\n\n  ${chainTo(pkg, graph)}\n` : ''
    expect(reached).toBe('')
  })

  it('does not pull task or planner screens in to render a login screen', () => {
    const screens = [...graph.seen].filter((f) => /features\/(tasks|commitments)\/screens\//.test(f))
    expect(screens).toEqual([])
  })
})
