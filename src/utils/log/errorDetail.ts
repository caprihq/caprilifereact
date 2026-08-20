/**
 * Turn an unknown thrown value into something worth logging.
 *
 * The single most useful fact when a request fails is whether it **reached the
 * server at all**: an axios error carries `response` only when the server
 * answered, so its absence means DNS, TLS, timeout, or no network. Everything
 * downstream — "is this a bad password or a bad base URL?" — follows from that.
 *
 * `emailAuth.toMessage` maps failures onto friendly copy and drops the original,
 * which is why a failing sign-in produced no diagnosable output. This keeps the
 * facts.
 *
 * Pure: no I/O, no console. The caller logs.
 */

export type ErrorDetail = {
  /** True when the server answered, whatever it said. */
  readonly reachedServer: boolean
  /** HTTP status, when there was a response. */
  readonly status?: number
  /** Transport code: ERR_NETWORK, ECONNABORTED, ETIMEDOUT… */
  readonly code?: string
  readonly message: string
  readonly method?: string
  /** Request URL with any access_token stripped. */
  readonly url?: string
  /** Response body, truncated — Base44 puts its own message here. */
  readonly body?: string
}

const MAX_BODY = 400

/** Remove token values from anything about to be logged. */
export const redact = (value: string): string =>
  value
    .replace(/(access_token=)[^&\s]*/gi, '$1<redacted>')
    .replace(/(Bearer\s+)[\w.-]+/gi, '$1<redacted>')

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return undefined
}

/** Body as text, whether the server sent JSON or a string. */
const readBody = (data: unknown): string | undefined => {
  if (data === undefined || data === null) return undefined
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data)
    if (!text) return undefined
    const trimmed = text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}…` : text
    return redact(trimmed)
  } catch {
    // A body that will not serialise is still worth noting.
    return '<unserialisable body>'
  }
}

type RequestConfig = { url?: unknown; method?: unknown; baseURL?: unknown }

/**
 * The shape an axios or SDK rejection may carry. Every field is optional.
 *
 * Base44 rejects with its own `Base44Error`, which flattens the axios error:
 * `status`, `code` and the response body as **`data`**, with no `response` and
 * no `config` — those stay on `originalError`. Reading only `response.data`
 * therefore found nothing, and a wrong password reached the user as the generic
 * "That request was not accepted" instead of the server's own wording.
 */
type ErrorLike = {
  message?: unknown
  code?: unknown
  status?: unknown
  /** Base44Error's response body, its equivalent of `response.data`. */
  data?: unknown
  response?: { status?: unknown; data?: unknown; statusText?: unknown }
  config?: RequestConfig
  /** The axios error Base44Error wraps — where config and transport code live. */
  originalError?: { code?: unknown; config?: RequestConfig }
}

/** Axios keeps the request on the error; Base44Error only on the one it wraps. */
const readConfig = (candidate: ErrorLike): RequestConfig | undefined =>
  candidate.config ?? candidate.originalError?.config

/** Full request URL, redacted. */
const readUrl = (config: RequestConfig | undefined): string | undefined => {
  const path = asString(config?.url)
  if (path === undefined) return undefined
  const base = asString(config?.baseURL)
  return redact(base === undefined ? path : `${base}${path}`)
}

/**
 * Base44Error's own `code` is the API's error code from the body; the transport
 * code (ERR_NETWORK, ETIMEDOUT) is on the axios error it wraps.
 */
const readCode = (candidate: ErrorLike): string | undefined =>
  asString(candidate.code) ?? asString(candidate.originalError?.code)

/** HTTP status from either shape the SDK produces. */
const readStatus = (candidate: ErrorLike): string | undefined =>
  asString(candidate.response?.status) ?? asString(candidate.status)

const readMessage = (candidate: ErrorLike): string =>
  asString(candidate.message) ??
  asString(candidate.response?.statusText) ??
  'Unknown error (no message on the thrown value)'

export const describeError = (error: unknown): ErrorDetail => {
  if (typeof error !== 'object' || error === null) {
    return { reachedServer: false, message: String(error) }
  }

  const candidate = error as ErrorLike
  const response = candidate.response
  const status = readStatus(candidate)
  // A status means the server answered even if `response` itself is absent,
  // which is how the SDK sometimes reshapes its errors.
  const reachedServer = response !== undefined || status !== undefined

  // Each computed once: calling these inside the spread would defeat narrowing
  // under exactOptionalPropertyTypes.
  const config = readConfig(candidate)
  const url = readUrl(config)
  const body = readBody(response?.data ?? candidate.data)
  const method = asString(config?.method)
  const code = readCode(candidate)
  const message = readMessage(candidate)

  return {
    reachedServer,
    ...(status === undefined ? {} : { status: Number(status) }),
    ...(code === undefined ? {} : { code }),
    message: redact(message),
    ...(method === undefined ? {} : { method: method.toUpperCase() }),
    ...(url === undefined ? {} : { url }),
    ...(body === undefined ? {} : { body }),
  }
}

/** One-line summary, the thing to read first in a log. */
export const summarizeError = (detail: ErrorDetail): string => {
  if (!detail.reachedServer) {
    const code = detail.code ? ` code=${detail.code}` : ''
    return `NEVER REACHED SERVER${code} — ${detail.message}`
  }
  return `server answered ${String(detail.status ?? 'unknown')} — ${detail.message}`
}
