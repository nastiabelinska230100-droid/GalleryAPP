import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../api'

export default function Stats() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  })

  if (isLoading) {
    return <div className="p-3 skeleton h-32 rounded-xl" />
  }

  const maxTotal = Math.max(...stats.map((s) => s.photo_count + s.video_count), 1)

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="rounded-xl p-3 space-y-2"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
        Статистика
      </h3>
      {stats.map((s) => {
        const total = s.photo_count + s.video_count
        const isMax = total === maxTotal && total > 0
        return (
          <div key={s.user_id} className="flex items-center gap-2">
            <span className="text-xs w-12 flex-shrink-0 font-medium"
              style={{ color: isMax ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-text-color)' }}>
              {s.display_name} {isMax ? '👑' : ''}
            </span>
            <div className="flex-1 flex gap-1 items-center">
              <span className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color)' }}>
                📷{s.photo_count} 🎬{s.video_count}
              </span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {formatDate(s.last_upload)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
