import { useToggleLike } from '../hooks/useLikes'

export default function MediaCard({ media, onClick }) {
  const likeMutation = useToggleLike()

  const handleLike = (e) => {
    e.stopPropagation()
    likeMutation.mutate(media.id)
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer group"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
      onClick={() => onClick?.(media)}
    >
      <div className="aspect-square relative">
        <img
          src={media.thumbnail_url || media.file_url}
          alt={media.caption || ''}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {media.file_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            <button onClick={handleLike} className="flex items-center gap-0.5">
              <span>{media.liked_by_me ? '❤️' : '🤍'}</span>
              <span>{media.like_count || 0}</span>
            </button>
            <span className="flex items-center gap-0.5">
              💬 {media.comment_count || 0}
            </span>
          </div>
          {media.tags && media.tags.length > 0 && (
            <div className="flex gap-1">
              {media.tags.map((tag) => (
                <span key={tag} className="bg-white/20 px-1 rounded text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
