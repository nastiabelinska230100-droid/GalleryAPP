import { useNavigate } from 'react-router-dom'
import { useUsers } from '../hooks/useUser'
import Stats from '../components/Stats'

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']

export default function Home() {
  const navigate = useNavigate()
  const { data: users = [], isLoading } = useUsers()

  return (
    <div className="pb-16">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--tg-theme-text-color)' }}>
          Наша Галерея
        </h1>

        {/* User tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-28 rounded-xl" />
              ))
            : users.map((user, i) => (
                <button
                  key={user.id}
                  onClick={() => navigate(`/gallery/${user.name}`)}
                  className="relative rounded-xl text-left text-white overflow-hidden h-36"
                  style={{ backgroundColor: colors[i % colors.length] }}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
                  <div className={`relative z-10 p-4 h-full flex flex-col justify-end ${user.avatar_url ? 'bg-gradient-to-t from-black/60 to-transparent' : ''}`}>
                    {!user.avatar_url && (
                      <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center text-lg font-bold mb-2">
                        {user.display_name[0]}
                      </div>
                    )}
                    <div className="font-semibold text-sm">{user.display_name}</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/40 text-xs px-2 py-0.5 rounded-full font-medium z-10">
                    {user.media_count || 0}
                  </div>
                </button>
              ))}
        </div>

        {/* Stats */}
        <Stats />

        {/* All photos button */}
        <button
          onClick={() => navigate('/feed')}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Все фото
        </button>
      </div>

      {/* Upload FAB */}
      <button
        onClick={() => navigate('/upload')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
        style={{
          backgroundColor: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
        }}
      >
        +
      </button>
    </div>
  )
}
