import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMediaList } from '../hooks/useMedia'
import MediaGrid from '../components/MediaGrid'
import FilterBar from '../components/FilterBar'
import Lightbox from '../components/Lightbox'

export default function Gallery() {
  const { userName } = useParams()
  const navigate = useNavigate()
  const [type, setType] = useState('')
  const [sort, setSort] = useState('newest')
  const [selectedId, setSelectedId] = useState(null)
  const observerRef = useRef()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMediaList({
    tagged: userName,
    type: type || undefined,
    sort,
  })

  const items = data?.pages?.flatMap((p) => p.items) || []

  const lastElementRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })
      if (node) observerRef.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const goBack = () => navigate('/')
    if (tg?.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(goBack)
      return () => {
        tg.BackButton.hide()
        tg.BackButton.offClick(goBack)
      }
    }
  }, [navigate])

  const displayNames = { sasha: 'Саша', vika: 'Вика', nastya: 'Настя', max: 'Макс' }

  return (
    <div className="pb-16">
      <div className="p-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          {displayNames[userName] || userName}
        </h2>
      </div>

      <FilterBar type={type} sort={sort} onTypeChange={setType} onSortChange={setSort} />

      <MediaGrid
        items={items}
        loading={isLoading || isFetchingNextPage}
        onMediaClick={(m) => setSelectedId(m.id)}
      />

      {items.length > 0 && <div ref={lastElementRef} className="h-4" />}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Пока ничего нет
        </div>
      )}

      {selectedId && (
        <Lightbox
          mediaId={selectedId}
          items={items}
          onClose={() => setSelectedId(null)}
          onNavigate={setSelectedId}
        />
      )}
    </div>
  )
}
