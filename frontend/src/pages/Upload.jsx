import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadForm from '../components/UploadForm'

export default function Upload() {
  const navigate = useNavigate()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.BackButton) {
      tg.BackButton.show()
      const handler = () => navigate(-1)
      tg.BackButton.onClick(handler)
      return () => {
        tg.BackButton.hide()
        tg.BackButton.offClick(handler)
      }
    }
  }, [navigate])

  return (
    <div className="pb-16">
      <div className="p-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          Загрузить
        </h2>
      </div>
      <UploadForm />
    </div>
  )
}
