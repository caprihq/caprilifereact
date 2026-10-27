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
 * Paid features send their own prompt and schema. Free features send only data: the
 * server writes their prompt (`invokeAI/prompts.ts` in the backend) and refuses one
 * from the client, or a free feature could be asked to do a paid one's work.
 */

/** Features whose prompt the app writes. All need a paid plan. */
export type PromptFeature = 'task_parse' | 'prioritise' | 'subtasks' | 'reprioritise'
/** Free features: the server writes the prompt from the data sent. */
export type DataFeature = 'recommendations'
export type AIFeature = PromptFeature | DataFeature

type InvokeResponse = { readonly data?: { readonly result?: unknown; readonly error?: string } }

const send = async (feature: AIFeature, payload: Record<string, unknown>): Promise<unknown> => {
  const call = () => base44.functions.invoke('invokeAI', { feature, ...payload }) as Promise<InvokeResponse>

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

export const invokeAI = (
  feature: PromptFeature,
  prompt: string,
  responseSchema?: Record<string, unknown>,
): Promise<unknown> =>
  send(feature, { prompt, ...(responseSchema ? { response_json_schema: responseSchema } : {}) })

export const invokeAIWithData = (feature: DataFeature, data: Record<string, unknown>): Promise<unknown> =>
  send(feature, { data })
