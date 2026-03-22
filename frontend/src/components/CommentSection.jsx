import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addComment, deleteComment } from '../api'
import { useCurrentUser } from '../hooks/useUser'

export default function CommentSection({ mediaId, comments = [] }) {
  const [text, setText] = useState('')
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const addMutation = useMutation({
    mutationFn: (commentText) => addComment(mediaId, commentText),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['media', mediaId] })
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', mediaId] })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addMutation.mutate(text.trim())
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
        Комментарии ({comments.length})
      </h3>

      <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: colors[(c.user_id || 0) % colors.length] }}
            >
              {(c.user_display_name || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
                  {c.user_display_name}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  {formatTime(c.created_at)}
                </span>
                {currentUser && currentUser.id === c.user_id && (
                  <button
                    onClick={() => deleteMutation.mutate(c.id)}
                    className="text-[10px] text-red-400 ml-auto"
                  >
                    удалить
                  </button>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tg-theme-text-color)' }}>
                {c.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 py-2"
        style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => {
            setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 400)
          }}
          placeholder="Написать комментарий..."
          className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || addMutation.isPending}
          className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          ➤
        </button>
      </form>
      {/* Отступ снизу чтобы клавиатура не перекрывала */}
      <div style={{ height: 250 }} />
    </div>
  )
}
