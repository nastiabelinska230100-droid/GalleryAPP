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
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: '#000' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ backgroundColor: '#000' }}>
      {/* Кроппер — занимает всё кроме нижних 70px */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 70 }}>
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

      {/* Кнопки — всегда внизу, фиксированная высота */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#000',
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
            border: 'none',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Сохраняю...' : 'Готово'}
        </button>
      </div>
    </div>
  )
}
