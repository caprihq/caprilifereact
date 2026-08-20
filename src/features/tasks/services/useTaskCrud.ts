import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { TaskEntity } from '@/services/api'
import { reportError } from '@/services'
import type { Task } from '@/types/entities'
import { queryKeys } from '@/services/api'

/**
 * Create / update / delete with optimistic cache writes and rollback.
 *
 * Split from useTaskMutations so each file stays inside the size limits and
 * the raw CRUD can be tested apart from the status/undo behaviour built on it.
 */

export type CrudFeedback = (message: string) => void

export const useTaskCrud = (userEmail: string | null, onError?: CrudFeedback) => {
  const queryClient = useQueryClient()
  const key = queryKeys.tasks(userEmail)

  /** Snapshot the cache, apply an optimistic change, hand back the rollback. */
  const optimistic = useCallback(
    async (update: (tasks: readonly Task[]) => readonly Task[]) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<readonly Task[]>(key)
      queryClient.setQueryData<readonly Task[]>(key, (old = []) => update(old))
      return { previous }
    },
    [queryClient, key],
  )

  // `previous` is explicitly `| undefined` rather than optional, because
  // exactOptionalPropertyTypes distinguishes "absent" from "present and
  // undefined" — and the snapshot legitimately can be undefined on first load.
  const rollback = useCallback(
    (
      context: { previous: readonly Task[] | undefined } | undefined,
      error: unknown,
      label: string,
    ) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      reportError(error, label)
    },
    [queryClient, key],
  )

  const onSettled = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: key })
  }, [queryClient, key])

  const createTask = useMutation({
    mutationFn: (data: Partial<Task>) => TaskEntity().create(data),
    onMutate: (data) =>
      optimistic((tasks) => [{ ...data, id: `optimistic-${String(tasks.length)}` } as Task, ...tasks]),
    onError: (error, _data, context) => {
      rollback(context, error, 'createTask')
      onError?.("Your task wasn't saved.")
    },
    onSettled,
  })

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => TaskEntity().update(id, data),
    onMutate: ({ id, data }) =>
      optimistic((tasks) => tasks.map((t) => (t.id === id ? { ...t, ...data } : t))),
    onError: (error, _vars, context) => {
      rollback(context, error, 'updateTask')
      onError?.("Changes weren't saved.")
    },
    onSettled,
  })

  const deleteTask = useMutation({
    mutationFn: (id: string) => TaskEntity().delete(id),
    onMutate: (id) => optimistic((tasks) => tasks.filter((t) => t.id !== id)),
    onError: (error, _id, context) => {
      rollback(context, error, 'deleteTask')
      onError?.("Task wasn't deleted.")
    },
    onSettled,
  })

  return { createTask, updateTask, deleteTask }
}
