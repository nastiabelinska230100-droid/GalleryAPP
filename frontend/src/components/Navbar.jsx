import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Главная', icon: '🏠' },
  { path: '/feed', label: 'Лента', icon: '📷' },
  { path: '/albums', label: 'Альбомы', icon: '📁' },
  { path: '/upload', label: 'Загрузить', icon: '➕' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-14 border-t"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color)',
        borderColor: 'var(--tg-theme-secondary-bg-color)',
      }}>
      {tabs.map((tab) => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center flex-1 h-full text-xs"
            style={{
              color: active ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
            }}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
