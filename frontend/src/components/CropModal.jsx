import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'

async function getCroppedImg(imageSrc, pixelCrop) {
  // Загружаем как blob чтобы обойти CORS
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

  // Загружаем картинку как blob для Cropper тоже
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
      if (localSrc) URL.revokeObjectURL(localSrc)
    }
  }, [imageSrc])

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !localSrc) return
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
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: '#000' }}>
      <div className="relative flex-1">
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

      <div className="flex-shrink-0 p-4 flex gap-3 justify-center" style={{ backgroundColor: '#000' }}>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
          }}
        >
          Отмена
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          {saving ? 'Сохраняю...' : 'Готово'}
        </button>
      </div>
    </div>
  )
}
