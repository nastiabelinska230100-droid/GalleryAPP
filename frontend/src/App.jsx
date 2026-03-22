import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useCurrentUser, useUsers, useLinkUser } from './hooks/useUser'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import MediaView from './pages/MediaView'
import Albums from './pages/Albums'

function UserSelector() {
  const { data: users = [] } = useUsers()
  const linkMutation = useLinkUser()

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
        Кто ты?
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--tg-theme-hint-color)' }}>
        Выбери себя для входа
      </p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        {users.map((user, i) => (
          <button
            key={user.id}
            onClick={() => linkMutation.mutate(user.id)}
            disabled={linkMutation.isPending}
            className="rounded-xl p-6 text-white text-center font-semibold text-lg disabled:opacity-50"
            style={{ backgroundColor: colors[i % colors.length] }}
          >
            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {user.display_name[0]}
            </div>
            {user.display_name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const { data: currentUser, isLoading, error } = useCurrentUser()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }
    setReady(true)
  }, [])

  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--tg-theme-button-color)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const notLinked = error?.response?.status === 404

  if (notLinked) {
    return (
      <BrowserRouter>
        <UserSelector />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery/:userName" element={<Gallery />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/media/:id" element={<MediaView />} />
          <Route path="/albums" element={<Albums />} />
        </Routes>
        <Navbar />
      </div>
    </BrowserRouter>
  )
}
