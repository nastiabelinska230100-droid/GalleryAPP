export default function FilterBar({ type, sort, onTypeChange, onSortChange }) {
  const types = [
    { value: '', label: 'Все' },
    { value: 'photo', label: 'Фото' },
    { value: 'video', label: 'Видео' },
  ]

  const sorts = [
    { value: 'newest', label: 'Новые' },
    { value: 'oldest', label: 'Старые' },
  ]

  return (
    <div className="flex items-center justify-between px-3 py-2 gap-2">
      <div className="flex gap-1">
        {types.map((t) => (
          <button
            key={t.value}
            onClick={() => onTypeChange(t.value)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: type === t.value ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: type === t.value ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-text-color)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="text-xs rounded px-2 py-1 border-none outline-none"
        style={{
          backgroundColor: 'var(--tg-theme-secondary-bg-color)',
          color: 'var(--tg-theme-text-color)',
        }}
      >
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}
