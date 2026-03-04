import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  getRecording,
  updateRecording,
  requestSummary,
  downloadSummary,
} from '../api/recordings'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import AudioPlayer from '../components/AudioPlayer'

const IN_PROGRESS_STATUSES = new Set(['uploaded', 'transcribing', 'summarizing'])

function renderMarkdown(text: string): string {
  // Simple markdown renderer: headers, bold, lists
  return text
    .replace(/^### (.+)$/gm, '<h3 style="margin: 16px 0 8px; font-size: 1.05rem; color: #1e293b;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin: 20px 0 10px; font-size: 1.2rem; color: #1a1a2e; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin: 0 0 16px; font-size: 1.5rem; color: #1a1a2e;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin: 4px 0 4px 20px;">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul style="margin: 8px 0;">${match}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
    .replace(/^(?!<[hul])(.+)$/gm, '$1')
}

function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const recordingId = parseInt(id ?? '0', 10)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const { data: recording, isLoading, isError } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: () => getRecording(recordingId),
    enabled: recordingId > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && IN_PROGRESS_STATUSES.has(status) ? 5000 : false
    },
  })

  useEffect(() => {
    if (recording?.title) {
      setTitleInput(recording.title)
    } else if (recording?.original_filename) {
      setTitleInput(recording.original_filename)
    }
  }, [recording?.title, recording?.original_filename])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const updateMutation = useMutation({
    mutationFn: (title: string) => updateRecording(recordingId, { title }),
    onSuccess: () => {
      setIsEditingTitle(false)
      queryClient.invalidateQueries({ queryKey: ['recording', recordingId] })
      queryClient.invalidateQueries({ queryKey: ['recordings'] })
    },
  })

  const summaryMutation = useMutation({
    mutationFn: () => requestSummary(recordingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recording', recordingId] })
    },
  })

  const downloadMutation = useMutation({
    mutationFn: () => downloadSummary(recordingId),
  })

  const handleTitleSave = () => {
    const trimmed = titleInput.trim()
    if (trimmed && trimmed !== recording?.title) {
      updateMutation.mutate(trimmed)
    } else {
      setIsEditingTitle(false)
    }
  }

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setIsEditingTitle(false)
  }

  if (isLoading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Recording laden...
        </div>
      </Layout>
    )
  }

  if (isError || !recording) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: '#ef4444', marginBottom: '16px' }}>Recording niet gevonden</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 20px',
              backgroundColor: '#1a1a2e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Terug naar dashboard
          </button>
        </div>
      </Layout>
    )
  }

  // Build audio URL from file_path - strip the /uploads prefix and serve via API
  // The backend stores files at UPLOAD_DIR, we serve the file by a different approach
  // For the audio player, we use the recordings API endpoint that returns the file
  const audioSrc = `/api/recordings/${recording.id}/audio`

  const canSummarize =
    recording.status === 'transcribed' || recording.status === 'summarized'
  const hasSummary = !!recording.summary_text
  const isProcessing = IN_PROGRESS_STATUSES.has(recording.status)

  return (
    <Layout>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Terug naar dashboard
        </button>

        {/* Header */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Title - editable */}
            <div style={{ flex: 1 }}>
              {isEditingTitle ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    ref={titleInputRef}
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      border: '2px solid #1a1a2e',
                      borderRadius: '6px',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleTitleSave}
                    disabled={updateMutation.isPending}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#1a1a2e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'transparent',
                      color: '#64748b',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Annuleer
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  onClick={() => setIsEditingTitle(true)}
                  title="Klik om te bewerken"
                >
                  <h1
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: '#1a1a2e',
                      margin: 0,
                    }}
                  >
                    {recording.title ?? recording.original_filename}
                  </h1>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>✏️</span>
                </div>
              )}
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginTop: '4px',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <span>{recording.original_filename}</span>
                {recording.duration && (
                  <span>
                    {Math.floor(recording.duration / 60)}m {Math.floor(recording.duration % 60)}s
                  </span>
                )}
                <span>
                  {format(new Date(recording.created_at), 'd MMMM yyyy HH:mm', { locale: nl })}
                </span>
              </div>
            </div>
            <StatusBadge status={recording.status} />
          </div>

          {/* Audio player */}
          <AudioPlayer src={audioSrc} />

          {recording.error_message && (
            <div
              style={{
                marginTop: '12px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              <strong>Fout:</strong> {recording.error_message}
            </div>
          )}
        </div>

        {/* Transcript section */}
        {recording.transcript_text ? (
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '16px' }}>
              Transcriptie
            </h2>
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                color: '#374151',
                whiteSpace: 'pre-wrap',
              }}
            >
              {recording.transcript_text}
            </div>
          </div>
        ) : isProcessing ? (
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏳</div>
            <p style={{ fontWeight: 500 }}>Transcriptie wordt verwerkt...</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Dit kan enkele minuten duren afhankelijk van de lengte van de opname.
            </p>
          </div>
        ) : null}

        {/* Summary section */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
              Samenvatting
            </h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => summaryMutation.mutate()}
                disabled={
                  !canSummarize ||
                  summaryMutation.isPending ||
                  recording.status === 'summarizing'
                }
                style={{
                  padding: '8px 18px',
                  backgroundColor: canSummarize && recording.status !== 'summarizing' ? '#1a1a2e' : '#e2e8f0',
                  color: canSummarize && recording.status !== 'summarizing' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    canSummarize && recording.status !== 'summarizing'
                      ? 'pointer'
                      : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {recording.status === 'summarizing'
                  ? 'Samenvatten...'
                  : hasSummary
                  ? 'Opnieuw samenvatten'
                  : 'Genereer samenvatting'}
              </button>

              {hasSummary && (
                <button
                  onClick={() => downloadMutation.mutate()}
                  disabled={downloadMutation.isPending}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'transparent',
                    color: '#1a1a2e',
                    border: '1px solid #1a1a2e',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {downloadMutation.isPending ? 'Downloaden...' : 'Download .md'}
                </button>
              )}
            </div>
          </div>

          {summaryMutation.isError && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                marginBottom: '16px',
              }}
            >
              Samenvatten mislukt. Probeer het opnieuw.
            </div>
          )}

          {hasSummary ? (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
                fontSize: '0.9rem',
                lineHeight: '1.7',
                color: '#374151',
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(recording.summary_text!) }}
            />
          ) : recording.status === 'summarizing' ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px',
                color: '#64748b',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✍️</div>
              <p style={{ fontWeight: 500 }}>Samenvatting wordt gegenereerd...</p>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '32px',
                color: '#94a3b8',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <p style={{ fontWeight: 500 }}>Nog geen samenvatting beschikbaar</p>
              {canSummarize && (
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  Klik op "Genereer samenvatting" om te beginnen
                </p>
              )}
              {!canSummarize && !isProcessing && (
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  Wacht tot de transcriptie is voltooid
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default RecordingDetailPage
