import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * No log line may carry a secret.
 *
 * "Only fingerprints are logged" was true when checked by hand, which is exactly
 * the kind of property that decays: logs get pasted into issues and chat, and one
 * `diag('...', { token })` added in a hurry undoes it silently — no type error,
 * no lint error, nothing visible in review.
 *
 * So this reads every source file, finds each logging call, and fails if a secret
 * reaches one as a *value*. Fingerprint helpers are allowed by name, since their
 * whole purpose is to be safe to print; `tokenFingerprint` is separately tested to
 * never reveal a whole token.
 */

const SRC = join(__dirname, '..', '..')

const LOG_CALLS = ['diag(', 'diagFailure(', 'logWarn(', 'logError(', 'console.warn(', 'console.error(']

/**
 * Helpers whose output is deliberately safe to print. `parseToken` belongs here
 * too: it takes a token and returns claims, so logging what it returns is fine.
 */
const SAFE_WRAPPERS =
  /\b(tokenFp|tokenFingerprint|describeResponse|summarizeError|parseToken)\([^)]*\)/g

/** Identifiers that must never be logged by value. */
const SECRETS = /\b(token|accessToken|access_token|password|newPassword|currentPassword)\b/

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return entry === 'testing' ? [] : sourceFiles(full)
    if (!/\.tsx?$/.test(entry) || entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
      return []
    }
    return [full]
  })

/** Text of a call's arguments, matching parens so multi-line calls are covered. */
const argumentsAt = (source: string, openParen: number): string => {
  let depth = 0
  for (let i = openParen; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1
    if (source[i] === ')') {
      depth -= 1
      if (depth === 0) return source.slice(openParen + 1, i)
    }
  }
  return source.slice(openParen + 1)
}

/**
 * Strip every place a secret's *name* may legitimately appear, leaving only its
 * use as a value.
 *
 * Order matters. String literals go late but before the name check, because log
 * messages say the word constantly — `'[push] could not obtain a device token'`
 * is prose, not a leak. Interpolations are lifted out first, so `${token}` inside
 * a template is still caught.
 */
const withoutAllowedUses = (args: string): string =>
  args
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(SAFE_WRAPPERS, 'SAFE')
    .replace(/\$\{([^}]*)\}/g, ' INTERP $1 ')
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, 'STR')
    .replace(/\b(token|accessToken|password|newPassword|currentPassword)\s*:/g, 'NAME:')
    .replace(/\b\w*[Tt]oken\w*\.length\b/g, 'LENGTH')

const offendersIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8')
  const found: string[] = []

  for (const call of LOG_CALLS) {
    let at = source.indexOf(call)
    while (at !== -1) {
      const args = withoutAllowedUses(argumentsAt(source, at + call.length - 1))
      if (SECRETS.test(args)) {
        found.push(`${file.replace(SRC, 'src')}: ${call}…${args.trim().slice(0, 80)}`)
      }
      at = source.indexOf(call, at + 1)
    }
  }
  return found
}

describe('secrets never reach a log', () => {
  it('finds source files to check — a broken walk must not pass silently', () => {
    const files = sourceFiles(SRC)
    expect(files.length).toBeGreaterThan(50)
    expect(files.some((f) => f.includes('authService'))).toBe(true)
  })

  it('no logging call takes a token or password by value', () => {
    const offenders = sourceFiles(SRC).flatMap(offendersIn)

    // Log a fingerprint (`tokenFp`) instead. If a value genuinely must be
    // inspected, do it behind __DEV__ and never commit it.
    expect(offenders).toEqual([])
  })

  it('catches a violation, so the guard is not vacuous', () => {
    // The check itself is regex-based, so prove it fires on the shape it targets.
    const violating = `diag('auth:restore', { token })`
    expect(SECRETS.test(withoutAllowedUses(argumentsAt(violating, violating.indexOf('('))))).toBe(
      true,
    )

    const safe = `diag('auth:restore', { token: tokenFp(token) })`
    expect(SECRETS.test(withoutAllowedUses(argumentsAt(safe, safe.indexOf('('))))).toBe(false)
  })
})
