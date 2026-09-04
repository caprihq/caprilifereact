import { base44 } from '@/services/api'
import { UPGRADE_REQUIRED, upgradeRequiredError } from '../logic/upgradeError'

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
  const response = (await base44.functions.invoke('invokeAI', {
    feature,
    prompt,
    ...(responseSchema ? { response_json_schema: responseSchema } : {}),
  })) as InvokeResponse

  // A 403 surfaces as a payload rather than a throw through this SDK, so the refusal
  // has to be recognised rather than assumed to be a result.
  if (response.data?.error === UPGRADE_REQUIRED) throw upgradeRequiredError(feature)

  return response.data?.result
}
