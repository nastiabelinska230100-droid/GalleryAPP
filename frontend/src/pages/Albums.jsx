import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAlbums, createAlbum, fetchMedia } from '../api'
import MediaGrid from '../components/MediaGrid'
import Lightbox from '../components/Lightbox'

export default function Albums() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ['albums'],
    queryFn: fetchAlbums,
  })

  const { data: albumMedia } = useQuery({
    queryKey: ['media', { album_id: selectedAlbum }],
    queryFn: () => fetchMedia({ album_id: selectedAlbum }),
    enabled: !!selectedAlbum,
  })

  const createMutation = useMutation({
    mutationFn: createAlbum,
    onSuccess: () => {
      setShowCreate(false)
      setNewTitle('')
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.BackButton && selectedAlbum) {
      tg.BackButton.show()
      const handler = () => setSelectedAlbum(null)
      tg.BackButton.onClick(handler)
      return () => {
        tg.BackButton.hide()
        tg.BackButton.offClick(handler)
      }
    }
  }, [selectedAlbum])

  const items = albumMedia?.items || []

  if (selectedAlbum) {
    const album = albums.find((a) => a.id === selectedAlbum)
    return (
      <div className="pb-16">
        <div className="p-3">
          <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
            {album?.title || 'Альбом'}
          </h2>
        </div>
        <MediaGrid items={items} loading={false} onMediaClick={(m) => setSelectedId(m.id)} />
        {items.length === 0 && (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Альбом пуст
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

  return (
    <div className="pb-16 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          Альбомы
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          + Создать
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Название альбома"
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color)',
              color: 'var(--tg-theme-text-color)',
            }}
          />
          <button
            onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())}
            disabled={!newTitle.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            OK
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Нет альбомов
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbum(album.id)}
              className="rounded-xl overflow-hidden text-left"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div className="aspect-video bg-gray-300">
                {album.cover_url ? (
                  <img src={album.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📁</div>
                )}
              </div>
              <div className="p-2">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
                  {album.title}
                </div>
                <div className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                  {album.media_count} файлов
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
