import type { RecordingStatus } from '../api/recordings'

interface StatusBadgeProps {
  status: RecordingStatus
}

const STATUS_CONFIG: Record<
  RecordingStatus,
  { label: string; backgroundColor: string; color: string }
> = {
  uploaded: { label: 'Geüpload', backgroundColor: '#e3e8f0', color: '#4a5568' },
  transcribing: { label: 'Transcriberen...', backgroundColor: '#fef3c7', color: '#92400e' },
  transcribed: { label: 'Getranscribeerd', backgroundColor: '#d1fae5', color: '#065f46' },
  summarizing: { label: 'Samenvatten...', backgroundColor: '#dbeafe', color: '#1e40af' },
  summarized: { label: 'Samengevat', backgroundColor: '#ede9fe', color: '#5b21b6' },
  error: { label: 'Fout', backgroundColor: '#fee2e2', color: '#991b1b' },
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.error

  const isAnimated = status === 'transcribing' || status === 'summarizing'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.backgroundColor,
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      {isAnimated && (
        <span
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: config.color,
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
      )}
      {config.label}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </span>
  )
}

export default StatusBadge
