import React from 'react'
import { AlertCircle, Loader2, Mic, Square, X } from 'lucide-react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

interface AudioRecorderProps {
  isTranscribing: boolean
  onAudioCaptured: (blob: Blob) => Promise<void>
  disabled?: boolean
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isTranscribing,
  onAudioCaptured,
  disabled = false,
}) => {
  const {
    isRecording,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder()

  const handleToggleRecord = async () => {
    if (disabled || isTranscribing) return

    if (isRecording) {
      const blob = await stopRecording()
      if (blob) {
        await onAudioCaptured(blob)
      }
    } else {
      await startRecording()
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    cancelRecording()
  }

  return (
    <div className="audio-recorder-container">
      {error && (
        <div className="audio-recorder-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="audio-recorder-controls">
        <button
          type="button"
          onClick={handleToggleRecord}
          disabled={disabled || isTranscribing}
          aria-label={
            isRecording
              ? 'Detener grabación de audio'
              : 'Iniciar grabación de audio por voz'
          }
          className={`record-button ${isRecording ? 'is-recording' : ''} ${
            isTranscribing ? 'is-transcribing' : ''
          }`}
        >
          {isTranscribing ? (
            <Loader2 className="animate-spin" size={26} aria-hidden="true" />
          ) : isRecording ? (
            <Square size={22} className="fill-current" aria-hidden="true" />
          ) : (
            <Mic size={26} aria-hidden="true" />
          )}
        </button>

        <div className="record-status-details">
          {isTranscribing ? (
            <div className="status-label transcribing-text">
              <span>Transcribiendo audio con Whisper (es)...</span>
            </div>
          ) : isRecording ? (
            <div className="recording-indicator">
              <span className="pulse-dot" aria-hidden="true" />
              <span className="record-time">{formatDuration(recordingDuration)}</span>
              <span className="record-hint">Grabando voz... Haz clic para terminar</span>
              <button
                type="button"
                className="cancel-record-button"
                onClick={handleCancel}
                title="Descartar grabación"
                aria-label="Descartar grabación"
              >
                <X size={16} aria-hidden="true" />
                <span>Descartar</span>
              </button>
            </div>
          ) : (
            <div className="idle-indicator">
              <span className="status-title">Presiona el micrófono para dictar</span>
              <span className="status-subtitle">
                Habla en español. Faster-Whisper transcribirá automáticamente tus ideas.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
