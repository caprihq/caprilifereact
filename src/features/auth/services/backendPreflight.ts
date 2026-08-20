import { base44Config } from '@/config'
import { diag, diagFailure, logWarn } from '@/utils'
import { describeError, summarizeError } from '@/utils'

/**
 * Can this device reach the Base44 **API**?
 *
 * Deliberately uses plain `fetch`, not the SDK, which separates two failures that
 * look identical from the UI:
 *
 *   · preflight fails  → network, DNS, TLS or a wrong base URL. No app-level fix.
 *   · preflight passes but SDK calls fail → requests leave the device, so the
 *                        problem is inside the SDK path (a missing Hermes
 *                        polyfill, headers, or the endpoint itself).
 *
 * The endpoint is the one the web client uses (web AuthContext.jsx:40-50):
 * baseURL `/api/apps/public` + `/prod/public-settings/by-id/{appId}`, with the
 * app id in a header.
 *
 * An earlier version of this probe called `/api/apps/{appId}/public-settings`,
 * which does not exist. Base44 serves its SPA catch-all for unknown paths, so it
 * answered `200 text/html` and the probe reported success no matter what. A JSON
 * content type is therefore part of the check, not an afterthought.
 *
 * **403 `auth_required` is a healthy result.** Without a session the API is
 * supposed to refuse; what matters is that it refused *in JSON*, which only the
 * real API does.
 *
 * Log-only. Never changes app state, never throws.
 */

const preflightUrl = (): string =>
  `${base44Config.appBaseUrl}/api/apps/public/prod/public-settings/by-id/${base44Config.appId}`

export type PreflightOutcome = {
  /** The API answered, whatever it said. */
  readonly apiReachable: boolean
  readonly status?: number
  /** False when the SPA catch-all answered instead of the API. */
  readonly wasJson?: boolean
  /** The app id the backend echoed back, when it did. */
  readonly echoedAppId?: string
  readonly durationMs: number
}

/** `extra_data.app_id` and `extra_data.reason` from a Base44 error body. */
const readExtra = (body: unknown): { appId?: string; reason?: string } => {
  if (typeof body !== 'object' || body === null) return {}
  const { extra_data: extra } = body as { extra_data?: unknown }
  if (typeof extra !== 'object' || extra === null) return {}
  const { app_id: appId, reason } = extra as { app_id?: unknown; reason?: unknown }
  return {
    ...(typeof appId === 'string' ? { appId } : {}),
    ...(typeof reason === 'string' ? { reason } : {}),
  }
}

export const runBackendPreflight = async (): Promise<PreflightOutcome> => {
  const url = preflightUrl()
  const startedAt = Date.now()

  diag('preflight:start', { url, appId: base44Config.appId })

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'X-App-Id': base44Config.appId },
    })
    const durationMs = Date.now() - startedAt
    const contentType = response.headers.get('content-type') ?? '(none)'
    const wasJson = contentType.includes('json')

    if (!wasJson) {
      // HTML from the catch-all: the host is up but this is not the API.
      logWarn(
        `[diag] preflight: ${url} answered ${String(response.status)} ${contentType} — ` +
          'that is Base44\'s SPA catch-all, not its API. The path is wrong.',
      )
      return { apiReachable: false, status: response.status, wasJson, durationMs }
    }

    const body: unknown = await response.json()
    const { appId: echoedAppId, reason } = readExtra(body)

    diag('preflight:apiReachable', {
      status: response.status,
      // 403 auth_required is the correct answer with no session.
      healthy: true,
      reason: reason ?? '(none)',
      echoedAppId: echoedAppId ?? '(not echoed)',
      appIdMatches: echoedAppId === undefined ? 'unknown' : echoedAppId === base44Config.appId,
      durationMs,
    })

    if (echoedAppId !== undefined && echoedAppId !== base44Config.appId) {
      // Worth shouting about: every call would hit the wrong app.
      logWarn(
        `[diag] preflight: app id MISMATCH — configured ${base44Config.appId}, ` +
          `backend echoed ${echoedAppId}.`,
      )
    }

    return {
      apiReachable: true,
      status: response.status,
      wasJson,
      ...(echoedAppId === undefined ? {} : { echoedAppId }),
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    diagFailure('preflight', error, { url, durationMs })
    logWarn(
      `[diag] preflight: the device could NOT reach ${url} — ` +
        `${summarizeError(describeError(error))}. Sign-in cannot work until this does.`,
    )
    return { apiReachable: false, durationMs }
  }
}
