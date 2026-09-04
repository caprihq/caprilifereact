import { base44 } from './base44Client'
import type { AIUsageLog, Commitment, FocusTime, Task, User } from '@/types/entities'

/**
 * Typed entity accessors.
 *
 * The SDK exposes `base44.entities` as a name→module index, so every property
 * is `T | undefined` and each call site would otherwise need a non-null
 * assertion. This resolves each entity once, fails loudly if it is missing
 * from the backend, and hands back a typed surface.
 *
 * A missing entity is a real deployment error worth crashing on — it means
 * base44/entities/*.jsonc and the live app have diverged. That is exactly how
 * the web client's `FocusTime` bug hid for so long.
 */

/**
 * What may be written to an entity.
 *
 * Looser than `Partial<T>` on purpose: Base44 distinguishes an **omitted** field,
 * which it leaves alone, from an explicit `null`, which clears it. Without the null
 * there is no way to express "remove this task from today" — the app would have to
 * cast, and a cast is exactly where that distinction gets lost.
 */
export type Writable<T> = { [K in keyof T]?: T[K] | null }

type EntityModule<T> = {
  filter: (query: Record<string, unknown>, sort?: string) => Promise<T[]>
  get: (id: string) => Promise<T>
  create: (data: Writable<T>) => Promise<T>
  update: (id: string, data: Writable<T>) => Promise<T>
  delete: (id: string) => Promise<unknown>
}

const resolve = <T>(name: string): EntityModule<T> => {
  const module = base44.entities[name] as EntityModule<T> | undefined
  if (!module) {
    throw new Error(
      `Base44 entity "${name}" is not available. It is declared in ` +
        `base44/entities/${name}.jsonc but missing from the deployed app.`,
    )
  }
  return module
}

export const TaskEntity = (): EntityModule<Task> => resolve<Task>('Task')
export const CommitmentEntity = (): EntityModule<Commitment> => resolve<Commitment>('Commitment')
export const UserEntity = (): EntityModule<User> => resolve<User>('User')
export const AIUsageLogEntity = (): EntityModule<AIUsageLog> => resolve<AIUsageLog>('AIUsageLog')
/** Read-only here: focus blocks describe the user to the model, nothing edits them. */
export const FocusTimeEntity = (): EntityModule<FocusTime> => resolve<FocusTime>('FocusTime')
