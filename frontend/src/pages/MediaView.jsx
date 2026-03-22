import { useParams, useNavigate } from 'react-router-dom'
import Lightbox from '../components/Lightbox'

export default function MediaView() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Lightbox
      mediaId={id}
      items={[]}
      onClose={() => navigate(-1)}
      onNavigate={(newId) => navigate(`/media/${newId}`, { replace: true })}
    />
  )
}
