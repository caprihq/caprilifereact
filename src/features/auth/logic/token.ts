import { logWarn } from '@/utils'
/**
 * Pure JWT helpers. No React, no React Native, no platform globals — the
 * base64 decoder is hand-rolled rather than relying on `atob` so this module
 * behaves identically in Hermes, Node and Jest (guidelines §3.4).
 *
 * The clock is always a parameter. Nothing here calls Date.now() (§2.3).
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** base64url text → raw bytes. Returns null on any character outside the alphabet. */
const toBytes = (segment: string): number[] | null => {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)

  const bytes: number[] = []
  let buffer = 0
  let bits = 0

  for (const char of padded) {
    if (char === '=') break
    const value = B64_ALPHABET.indexOf(char)
    if (value === -1) return null
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return bytes
}

/**
 * Minimal UTF-8 decode. JWT payloads are ASCII JSON in practice, but a
 * display_name with an accent would otherwise corrupt.
 */
const bytesToString = (bytes: readonly number[]): string => {
  let result = ''
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0
    if (byte < 0x80) {
      result += String.fromCharCode(byte)
      continue
    }
    if (byte < 0xe0) {
      result += String.fromCharCode(((byte & 0x1f) << 6) | ((bytes[i + 1] ?? 0) & 0x3f))
      i += 1
      continue
    }
    result += String.fromCharCode(
      ((byte & 0x0f) << 12) | (((bytes[i + 1] ?? 0) & 0x3f) << 6) | ((bytes[i + 2] ?? 0) & 0x3f),
    )
    i += 2
  }
  return result
}

/** Decode a base64url segment to a UTF-8 string. Returns null if malformed. */
const decodeBase64Url = (segment: string): string | null => {
  const bytes = toBytes(segment)
  return bytes === null ? null : bytesToString(bytes)
}

export type TokenClaims = {
  /** Expiry in milliseconds since epoch, or null when the token has no exp. */
  readonly expiresAt: number | null
  /** Login provider, when the token names one (e.g. "google", "apple"). */
  readonly provider: string | null
}

/** Parse a JWT's claims. Returns null for anything that is not a readable JWT. */
export const parseToken = (token: string | null | undefined): TokenClaims | null => {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  const payloadSegment = parts[1]
  if (!payloadSegment) return null

  const json = decodeBase64Url(payloadSegment)
  if (json === null) return null

  try {
    const claims = JSON.parse(json) as Record<string, unknown>
    const exp = claims.exp
    const provider = claims.provider ?? claims.idp ?? claims.auth_provider
    return {
      expiresAt: typeof exp === 'number' ? exp * 1000 : null,
      provider: typeof provider === 'string' ? provider.toLowerCase() : null,
    }
  } catch (error) {
    logWarn('[token] payload was not valid JSON', error)
    return null
  }
}

/**
 * A token with no readable expiry is treated as usable: the server is the
 * authority, and refusing it locally would lock out a valid session over a
 * claim-shape change.
 */
export const isExpired = (token: string | null | undefined, nowMs: number): boolean => {
  const claims = parseToken(token)
  if (claims?.expiresAt == null) return false
  return claims.expiresAt <= nowMs
}

/** True when the token is still valid but close enough to expiry to renew. */
export const needsRefresh = (
  token: string | null | undefined,
  nowMs: number,
  marginMs: number,
): boolean => {
  const claims = parseToken(token)
  if (claims?.expiresAt == null) return false
  return claims.expiresAt - nowMs <= marginMs && claims.expiresAt > nowMs
}

/** Non-reversible fingerprint for logs. Never log a whole token. */
export const tokenFingerprint = (token: string | null | undefined): string => {
  if (!token) return '(none)'
  return `len=${token.length} …${token.slice(-6)}`
}
