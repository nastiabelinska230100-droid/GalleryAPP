import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMedia, fetchMediaDetail, uploadMedia, deleteMedia } from '../api'

export function useMediaList(params = {}) {
  return useInfiniteQuery({
    queryKey: ['media', params],
    queryFn: ({ pageParam = 1 }) => fetchMedia({ ...params, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.items.length, 0)
      if (totalFetched < lastPage.total) {
        return allPages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
  })
}

export function useMediaDetail(id) {
  return useQuery({
    queryKey: ['media', id],
    queryFn: () => fetchMediaDetail(id),
    enabled: !!id,
  })
}

export function useUploadMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ formData, onProgress }) => uploadMedia(formData, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })
}
