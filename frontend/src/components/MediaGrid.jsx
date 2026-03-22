import MediaCard from './MediaCard'

function SkeletonCard() {
  return (
    <div className="aspect-square rounded-lg skeleton" />
  )
}

export default function MediaGrid({ items, loading, onMediaClick }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {items.map((media) => (
        <MediaCard key={media.id} media={media} onClick={onMediaClick} />
      ))}
      {loading && Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={`skeleton-${i}`} />
      ))}
    </div>
  )
}
