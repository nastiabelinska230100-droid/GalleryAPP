import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUploadMedia } from '../hooks/useMedia'
import { useUsers } from '../hooks/useUser'

export default function UploadForm() {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef()
  const navigate = useNavigate()
  const uploadMutation = useUploadMedia()
  const { data: users = [] } = useUsers()

  const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      video.onloadeddata = () => {
        video.currentTime = 1
      }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.7)
        URL.revokeObjectURL(video.src)
        resolve(thumbUrl)
      }
      video.onerror = () => resolve(null)
      video.src = URL.createObjectURL(file)
    })
  }

  const handleFiles = async (newFiles) => {
    const fileArray = Array.from(newFiles)
    setFiles((prev) => [...prev, ...fileArray])
    for (const file of fileArray) {
      if (file.type.startsWith('video/')) {
        const thumbUrl = await generateVideoThumbnail(file)
        setPreviews((prev) => [...prev, { name: file.name, url: URL.createObjectURL(file), thumb: thumbUrl, type: file.type }])
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviews((prev) => [...prev, { name: file.name, url, thumb: null, type: file.type }])
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const toggleTag = (userId) => {
    setSelectedTags((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]?.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (files.length === 0 || selectedTags.length === 0) return

    setUploading(true)
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    formData.append('tags', selectedTags.join(','))
    formData.append('caption', caption)

    try {
      await uploadMutation.mutateAsync({
        formData,
        onProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total))
        },
      })
      setDone(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      alert('Ошибка загрузки: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="text-5xl">✅</span>
        <p className="text-lg font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
          Загружено!
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Drop zone */}
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer"
        style={{ borderColor: 'var(--tg-theme-hint-color)' }}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <span className="text-3xl block mb-2">📸</span>
        <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Нажмите или перетащите файлы
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
          JPG, PNG, HEIC, MP4, MOV
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/quicktime,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files)
            }
            e.target.value = ''
          }}
        />
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
              {p.type.startsWith('video/') ? (
                <div className="w-full h-full relative">
                  {p.thumb ? (
                    <img src={p.thumb} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: '#333' }} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm ml-0.5">▶</span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50">
                    <span className="text-white text-[8px] truncate block">{p.name}</span>
                  </div>
                </div>
              ) : (
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
          Кто на фото/видео? *
        </p>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => toggleTag(u.id)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectedTags.includes(u.id)
                  ? 'var(--tg-theme-button-color)'
                  : 'var(--tg-theme-secondary-bg-color)',
                color: selectedTags.includes(u.id)
                  ? 'var(--tg-theme-button-text-color)'
                  : 'var(--tg-theme-text-color)',
              }}
            >
              {u.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Подпись (необязательно)"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
          }}
        />
      </div>

      {/* Progress */}
      {uploading && (
        <div className="w-full rounded-full h-2 overflow-hidden"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--tg-theme-button-color)',
            }}
          />
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={files.length === 0 || selectedTags.length === 0 || uploading}
        className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
        style={{
          backgroundColor: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
        }}
      >
        {uploading ? `Загрузка... ${progress}%` : `Загрузить (${files.length})`}
      </button>
    </div>
  )
}
