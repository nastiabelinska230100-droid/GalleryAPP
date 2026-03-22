import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMe, linkUser, fetchUsers } from '../api'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })
}

export function useLinkUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: linkUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
