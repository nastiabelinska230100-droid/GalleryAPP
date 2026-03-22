import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
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
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
    }
    image.src = imageSrc
  })
}

export default function CropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
    onConfirm(blob)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: '#000' }}>
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
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
          className="px-6 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          Готово
        </button>
      </div>
    </div>
  )
}
