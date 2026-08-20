/**
 * Exhaustiveness guard for discriminated unions (guidelines §2.6).
 *
 * Reaching this at runtime means a union gained a member that some `switch`
 * never handled — a real defect, so it throws rather than returning a default
 * that would quietly do the wrong thing.
 */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
