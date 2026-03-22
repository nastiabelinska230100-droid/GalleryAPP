import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addComment, deleteComment, toggleReaction } from '../api'
import { useCurrentUser } from '../hooks/useUser'

const REACTION_EMOJIS = ['😂', '❤️', '🔥', '😮', '😢', '👍']

export default function CommentSection({ mediaId, comments = [] }) {
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(null)
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }, 400)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['media', mediaId] })
    queryClient.invalidateQueries({ queryKey: ['media'] })
  }

  const addMutation = useMutation({
    mutationFn: ({ commentText, replyToId }) => addComment(mediaId, commentText, replyToId),
    onSuccess: () => {
      setText('')
      setReplyTo(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: invalidate,
  })

  const reactMutation = useMutation({
    mutationFn: ({ commentId, emoji }) => toggleReaction(commentId, emoji),
    onSuccess: () => {
      setShowEmojiPicker(null)
      invalidate()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addMutation.mutate({ commentText: text.trim(), replyToId: replyTo?.id || null })
  }

  const handleReply = (comment) => {
    setReplyTo(comment)
    inputRef.current?.focus()
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
            {c.user_avatar_url ? (
              <img
                src={c.user_avatar_url}
                alt={c.user_display_name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: colors[(c.user_id || 0) % colors.length] }}
              >
                {(c.user_display_name || '?')[0]}
              </div>
            )}
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

              {/* Reply reference */}
              {c.reply_to_user && (
                <div
                  className="text-[10px] mt-0.5 px-2 py-0.5 rounded border-l-2"
                  style={{
                    color: 'var(--tg-theme-hint-color)',
                    borderColor: 'var(--tg-theme-button-color)',
                    backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                  }}
                >
                  <span className="font-semibold">{c.reply_to_user}</span>
                  {': '}
                  {(c.reply_to_text || '').slice(0, 60)}
                  {(c.reply_to_text || '').length > 60 ? '...' : ''}
                </div>
              )}

              <p className="text-xs mt-0.5" style={{ color: 'var(--tg-theme-text-color)' }}>
                {c.text}
              </p>

              {/* Existing reactions */}
              {(c.reactions || []).length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {c.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => reactMutation.mutate({ commentId: c.id, emoji: r.emoji })}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px]"
                      style={{
                        backgroundColor: r.users?.some((u) => u.user_id === currentUser?.id)
                          ? 'var(--tg-theme-button-color)'
                          : 'var(--tg-theme-secondary-bg-color)',
                        color: r.users?.some((u) => u.user_id === currentUser?.id)
                          ? 'var(--tg-theme-button-text-color)'
                          : 'var(--tg-theme-text-color)',
                      }}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons — bottom right */}
              <div className="flex items-center justify-end gap-3 mt-1">
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === c.id ? null : c.id)}
                  className="text-[11px]"
                  style={{ color: 'var(--tg-theme-hint-color)' }}
                >
                  😊
                </button>
                <button
                  onClick={() => handleReply(c)}
                  className="text-[10px]"
                  style={{ color: 'var(--tg-theme-hint-color)' }}
                >
                  ответить
                </button>
              </div>

              {/* Emoji picker */}
              {showEmojiPicker === c.id && (
                <div
                  className="flex gap-1.5 mt-1 p-2 rounded-lg justify-center"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => reactMutation.mutate({ commentId: c.id, emoji })}
                      className="text-xl active:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-hint-color)',
          }}
        >
          <span className="flex-1 truncate">
            Ответ для <b style={{ color: 'var(--tg-theme-text-color)' }}>{replyTo.user_display_name}</b>
            {': '}
            {replyTo.text?.slice(0, 40)}{replyTo.text?.length > 40 ? '...' : ''}
          </span>
          <button onClick={() => setReplyTo(null)} className="text-sm font-bold">
            ×
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 py-2"
        style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={scrollToBottom}
          placeholder={replyTo ? 'Написать ответ...' : 'Написать комментарий...'}
          className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            borderTopLeftRadius: replyTo ? 0 : undefined,
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
      <div ref={bottomRef} style={{ height: 350 }} />
    </div>
  )
}
