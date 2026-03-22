import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Lightbox from '../components/Lightbox'

export default function MediaView() {
  const { id } = useParams()
  const navigate = useNavigate()

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [navigate])

  return (
    <Lightbox
      mediaId={id}
      items={[]}
      onClose={goBack}
      onNavigate={(newId) => navigate(`/media/${newId}`, { replace: true })}
    />
  )
}
