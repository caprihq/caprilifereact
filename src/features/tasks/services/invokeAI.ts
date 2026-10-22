import { base44 } from '@/services/api'
import { refusalCodeOf, refusalError } from '../logic/upgradeError'

/**
 * Every model call in the app goes through here.
 *
 * The four AI services used to call `integrations.Core.InvokeLLM` directly, each
 * deciding for itself whether the user's plan allowed it. That made the paid gates a
 * courtesy — they hold for anyone running the shipped app and stop nobody who
 * rebuilds it. The `invokeAI` backend function now reads the plan from the account
 * and refuses what the account cannot have; this is the client half of that.
 *
 * The prompt and schema still belong to each feature. This adds the plan check and a
 * consistent shape for "the server said no", nothing else.
 */

export type AIFeature =
  | 'task_parse'
  | 'prioritise'
  | 'subtasks'
  | 'reprioritise'
  | 'recommendations'

type InvokeResponse = { readonly data?: { readonly result?: unknown; readonly error?: string } }

export const invokeAI = async (
  feature: AIFeature,
  prompt: string,
  responseSchema?: Record<string, unknown>,
): Promise<unknown> => {
  const call = () =>
    base44.functions.invoke('invokeAI', {
      feature,
      prompt,
      ...(responseSchema ? { response_json_schema: responseSchema } : {}),
    }) as Promise<InvokeResponse>

  // A refusal — 403 upgrade_required, 429 daily_limit — is thrown by this SDK's
  // functions client, body and all, so it is read from the error as well as from a
  // resolved reply (see `refusalCodeOf`). Tagged, it lets callers say "upgrade" or
  // "resets tomorrow" instead of "try again"; anything else is rethrown as it came.
  const response = await call().catch((error: unknown) => {
    throw refusalError(refusalCodeOf(error), feature) ?? error
  })

  const refusal = refusalError(refusalCodeOf(response), feature)
  if (refusal) throw refusal

  return response.data?.result
}
