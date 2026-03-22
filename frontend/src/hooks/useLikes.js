import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleLike } from '../api'

export function useToggleLike() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleLike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })
}
