import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToggleLike } from '../hooks/useLikes'
import { useDeleteMedia, useMediaDetail } from '../hooks/useMedia'
import { useCurrentUser } from '../hooks/useUser'
import { setUserAvatar } from '../api'
import CommentSection from './CommentSection'

export default function Lightbox({ mediaId, items, onClose, onNavigate }) {
  const { data: media, isLoading } = useMediaDetail(mediaId)
  const { data: currentUser } = useCurrentUser()
  const likeMutation = useToggleLike()
  const deleteMutation = useDeleteMedia()
  const [touchStart, setTouchStart] = useState(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarSet, setAvatarSet] = useState(null)
  const videoRef = useRef(null)
  const queryClient = useQueryClient()

  const avatarMutation = useMutation({
    mutationFn: ({ userId, mediaId }) => setUserAvatar(userId, mediaId),
    onSuccess: (_, { userName }) => {
      setAvatarSet(userName)
      setShowAvatarPicker(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setTimeout(() => setAvatarSet(null), 2000)
    },
  })

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(onClose)
      return () => {
        tg.BackButton.hide()
        tg.BackButton.offClick(onClose)
      }
    }
  }, [onClose])

  if (isLoading || !media) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--tg-theme-button-color)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const currentIndex = items?.findIndex((m) => m.id === mediaId) ?? -1

  const handleSwipe = (direction) => {
    if (!items || currentIndex === -1) return
    const nextIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex >= 0 && nextIndex < items.length) {
      onNavigate?.(items[nextIndex].id)
    }
  }

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      handleSwipe(diff > 0 ? 'left' : 'right')
    }
    setTouchStart(null)
  }

  const handleDelete = () => {
    if (confirm('Удалить это медиа?')) {
      deleteMutation.mutate(media.id, { onSuccess: onClose })
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = media.file_url
    a.download = ''
    a.target = '_blank'
    a.click()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const isOwner = currentUser && currentUser.id === media.uploader_id

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 flex-shrink-0">
        <button onClick={onClose} className="text-sm font-medium"
          style={{ color: 'var(--tg-theme-button-color)' }}>
          Назад
        </button>
        <div className="flex gap-3">
          <button onClick={handleDownload} className="text-sm"
            style={{ color: 'var(--tg-theme-button-color)' }}>
            Скачать
          </button>
          {isOwner && (
            <button onClick={handleDelete} className="text-sm text-red-500">
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* Media */}
      <div
        className="flex-shrink-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {media.file_type === 'video' ? (
          <video
            ref={videoRef}
            src={media.file_url}
            className="w-full max-h-[60vh] object-contain bg-black"
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={media.file_url}
            alt={media.caption || ''}
            className="w-full max-h-[60vh] object-contain"
          />
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-3 flex-1">
        {/* Like + info */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => likeMutation.mutate(media.id)}
            className="flex items-center gap-1 text-lg"
          >
            <span>{media.liked_by_me ? '❤️' : '🤍'}</span>
            <span className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
              {media.like_count}
            </span>
          </button>
          <span className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {formatDate(media.created_at)}
          </span>
        </div>

        {/* Caption */}
        {media.caption && (
          <p className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
            {media.caption}
          </p>
        )}

        {/* Uploader & tags */}
        <div className="text-xs space-y-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
          <div>Загрузил(а): <b style={{ color: 'var(--tg-theme-text-color)' }}>{media.uploader_name}</b></div>
          {media.tagged_users && media.tagged_users.length > 0 && (
            <div>
              На фото: {media.tagged_users.map((u) => u.display_name).join(', ')}
            </div>
          )}
        </div>

        {/* Set as cover photo */}
        {media.file_type === 'photo' && media.tagged_users && media.tagged_users.length > 0 && (
          <div>
            {avatarSet && (
              <div className="text-xs text-green-500 mb-1">
                Обложка для {avatarSet} установлена!
              </div>
            )}
            {!showAvatarPicker ? (
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  color: 'var(--tg-theme-text-color)',
                }}
              >
                Сделать обложкой
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs self-center" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  Для кого:
                </span>
                {media.tagged_users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => avatarMutation.mutate({
                      userId: u.id,
                      mediaId: media.id,
                      userName: u.display_name,
                    })}
                    disabled={avatarMutation.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--tg-theme-button-color)',
                      color: 'var(--tg-theme-button-text-color)',
                    }}
                  >
                    {u.display_name}
                  </button>
                ))}
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-xs px-2 py-1.5"
                  style={{ color: 'var(--tg-theme-hint-color)' }}
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <CommentSection mediaId={media.id} comments={media.comments || []} />
      </div>
    </div>
  )
}
