import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  listRecordings,
  uploadRecording,
  deleteRecording,
  type RecordingListItem,
} from '../api/recordings'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'

const IN_PROGRESS_STATUSES = new Set(['uploaded', 'transcribing', 'summarizing'])

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recordings'],
    queryFn: () => listRecordings(),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const hasInProgress = items.some((r) => IN_PROGRESS_STATUSES.has(r.status))
      return hasInProgress ? 5000 : false
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadRecording(file, setUploadProgress),
    onSuccess: () => {
      setUploadProgress(null)
      setUploadError(null)
      queryClient.invalidateQueries({ queryKey: ['recordings'] })
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setUploadError(detail ?? 'Upload mislukt. Probeer het opnieuw.')
      setUploadProgress(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecording(id),
    onSuccess: () => {
      setDeleteConfirmId(null)
      queryClient.invalidateQueries({ queryKey: ['recordings'] })
    },
  })

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setUploadError(null)
        uploadMutation.mutate(acceptedFiles[0])
      }
    },
    [uploadMutation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.mp4', '.webm'],
    },
    maxFiles: 1,
    disabled: uploadMutation.isPending,
  })

  const recordings = data?.items ?? []

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '24px', color: '#1a1a2e' }}>
          Mijn Recordings
        </h2>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? '#1a1a2e' : '#cbd5e1'}`,
            borderRadius: '12px',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
            backgroundColor: isDragActive ? '#f0f4ff' : '#fafafa',
            transition: 'all 0.2s',
            marginBottom: '16px',
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎙️</div>
          {uploadMutation.isPending ? (
            <div>
              <div style={{ color: '#1a1a2e', fontWeight: 600, marginBottom: '8px' }}>
                Uploaden...
              </div>
              {uploadProgress !== null && (
                <div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      margin: '0 auto',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '4px',
                      height: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        backgroundColor: '#1a1a2e',
                        borderRadius: '4px',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>
                    {uploadProgress}%
                  </div>
                </div>
              )}
            </div>
          ) : isDragActive ? (
            <p style={{ color: '#1a1a2e', fontWeight: 600 }}>Laat los om te uploaden</p>
          ) : (
            <div>
              <p style={{ color: '#374151', fontWeight: 500, marginBottom: '4px' }}>
                Sleep een audiobestand hierheen, of klik om te bladeren
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                Ondersteund: MP3, WAV, OGG, FLAC, AAC, M4A (max 100 MB)
              </p>
            </div>
          )}
        </div>

        {uploadError && (
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
            {uploadError}
          </div>
        )}

        {/* Recordings list */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Recordings laden...
          </div>
        )}

        {isError && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            Kon recordings niet laden. Vernieuw de pagina.
          </div>
        )}

        {!isLoading && !isError && recordings.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              color: '#94a3b8',
              backgroundColor: '#fafafa',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📂</div>
            <p style={{ fontWeight: 500 }}>Nog geen recordings</p>
            <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
              Upload een audiobestand om te beginnen
            </p>
          </div>
        )}

        {recordings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recordings.map((recording: RecordingListItem) => (
              <div
                key={recording.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: '#1e293b',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {recording.title ?? recording.original_filename}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{recording.original_filename}</span>
                    <span>{formatDuration(recording.duration)}</span>
                    <span>
                      {formatDistanceToNow(new Date(recording.created_at), {
                        addSuffix: true,
                        locale: nl,
                      })}
                    </span>
                  </div>
                  {recording.error_message && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#ef4444',
                        marginTop: '4px',
                      }}
                    >
                      Fout: {recording.error_message}
                    </div>
                  )}
                </div>

                <StatusBadge status={recording.status} />

                <button
                  onClick={() => navigate(`/recordings/${recording.id}`)}
                  style={{
                    padding: '7px 16px',
                    backgroundColor: '#1a1a2e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Bekijk details
                </button>

                {deleteConfirmId === recording.id ? (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => deleteMutation.mutate(recording.id)}
                      disabled={deleteMutation.isPending}
                      style={{
                        padding: '7px 14px',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                      }}
                    >
                      Bevestig
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      style={{
                        padding: '7px 14px',
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
                  <button
                    onClick={() => setDeleteConfirmId(recording.id)}
                    style={{
                      padding: '7px 12px',
                      backgroundColor: 'transparent',
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                    title="Verwijder recording"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default DashboardPage
