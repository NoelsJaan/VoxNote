import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  src: string
  title?: string
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)
    const handleCanPlay = () => setIsLoading(false)
    const handleWaiting = () => setIsLoading(true)
    const handleError = () => {
      setError('Kan audio niet laden')
      setIsLoading(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('error', handleError)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setError('Afspelen mislukt'))
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
      }}
    >
      {title && (
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px', fontWeight: 500 }}>
          {title}
        </div>
      )}

      <audio ref={audioRef} src={src} preload="metadata" />

      {error ? (
        <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#1a1a2e',
              border: 'none',
              color: '#fff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
              opacity: isLoading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
            title={isPlaying ? 'Pauzeren' : 'Afspelen'}
          >
            {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
          </button>

          {/* Current time */}
          <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '36px', flexShrink: 0 }}>
            {formatTime(currentTime)}
          </span>

          {/* Progress bar */}
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              step={0.1}
              onChange={handleSeek}
              style={{
                width: '100%',
                height: '4px',
                appearance: 'none',
                backgroundColor: '#e2e8f0',
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
                background: `linear-gradient(to right, #1a1a2e ${progress}%, #e2e8f0 ${progress}%)`,
              }}
            />
          </div>

          {/* Duration */}
          <span style={{ fontSize: '0.8rem', color: '#64748b', minWidth: '36px', flexShrink: 0, textAlign: 'right' }}>
            {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  )
}

export default AudioPlayer
