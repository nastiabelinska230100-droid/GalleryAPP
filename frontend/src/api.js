import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export function getTelegramUserId() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0
  } catch {
    return 0
  }
}

api.interceptors.request.use((config) => {
  const userId = getTelegramUserId()
  if (userId) {
    config.headers['X-Telegram-User-Id'] = userId
  }
  return config
})

export async function fetchMedia(params = {}) {
  const { data } = await api.get('/media', { params })
  return data
}

export async function fetchMediaDetail(id) {
  const { data } = await api.get(`/media/${id}`)
  return data
}

export async function uploadMedia(formData, onProgress) {
  const { data } = await api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
  return data
}

export async function deleteMedia(id) {
  const { data } = await api.delete(`/media/${id}`)
  return data
}

export async function toggleLike(mediaId) {
  const { data } = await api.post(`/media/${mediaId}/like`)
  return data
}

export async function fetchComments(mediaId) {
  const { data } = await api.get(`/media/${mediaId}/comments`)
  return data
}

export async function addComment(mediaId, text) {
  const { data } = await api.post(`/media/${mediaId}/comments`, { text })
  return data
}

export async function deleteComment(commentId) {
  const { data } = await api.delete(`/comments/${commentId}`)
  return data
}

export async function fetchAlbums() {
  const { data } = await api.get('/albums')
  return data
}

export async function createAlbum(title) {
  const { data } = await api.post('/albums', { title })
  return data
}

export async function addMediaToAlbum(albumId, mediaIds) {
  const { data } = await api.post(`/albums/${albumId}/media`, { media_ids: mediaIds })
  return data
}

export async function fetchAlbum(albumId) {
  const { data } = await api.get(`/albums/${albumId}`)
  return data
}

export async function fetchUsers() {
  const { data } = await api.get('/users')
  return data
}

export async function fetchStats() {
  const { data } = await api.get('/users/stats')
  return data
}

export async function linkUser(userId) {
  const { data } = await api.post('/users/link', null, { params: { user_id: userId } })
  return data
}

export async function setUserAvatar(userId, mediaId) {
  const { data } = await api.post(`/users/${userId}/avatar`, { media_id: mediaId })
  return data
}

export async function fetchMe() {
  const { data } = await api.get('/users/me')
  return data
}

export default api
