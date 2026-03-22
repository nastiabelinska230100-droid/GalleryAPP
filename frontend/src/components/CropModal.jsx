import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'

async function getCroppedImg(imageSrc, pixelCrop) {
  const response = await fetch(imageSrc)
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      )
      canvas.toBlob(
        (resultBlob) => {
          URL.revokeObjectURL(blobUrl)
          resolve(resultBlob)
        },
        'image/jpeg',
        0.9,
      )
    }
    image.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('Failed to load image'))
    }
    image.src = blobUrl
  })
}

export default function CropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [localSrc, setLocalSrc] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(imageSrc)
      .then((r) => r.blob())
      .then((blob) => {
        if (!cancelled) {
          setLocalSrc(URL.createObjectURL(blob))
        }
      })
    return () => {
      cancelled = true
    }
  }, [imageSrc])

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } catch (e) {
      console.error('Crop error:', e)
    } finally {
      setSaving(false)
    }
  }

  if (!localSrc) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#000',
      }}>
        <div style={{
          width: 32, height: 32, border: '2px solid #fff',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: '#000' }}>
      {/* Кнопки сверху */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 210,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'rgba(0,0,0,0.7)',
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: '#555',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            padding: '8px 20px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: '#2481cc',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Сохраняю...' : 'Готово'}
        </button>
      </div>

      {/* Кроппер на весь экран */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Cropper
          image={localSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
    </div>
  )
}
