import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  recordingDuration: number
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => void
}

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ]

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  return undefined
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<number | null>(null)

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    setRecordingDuration(0)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de grabación de audio no está soportada en este navegador.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(250) // collect chunks every 250ms
      setIsRecording(true)

      // Start duration counter
      const startTime = Date.now()
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 500)
    } catch (err: unknown) {
      stopTracks()
      setIsRecording(false)
      const message =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Permiso de micrófono denegado. Permite el acceso al micrófono en tu navegador.'
            : err.message
          : 'Error desconocido al acceder al micrófono.'
      setError(message)
    }
  }, [stopTracks])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current

      if (!recorder || recorder.state === 'inactive') {
        stopTracks()
        setIsRecording(false)
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        stopTracks()
        setIsRecording(false)
        resolve(audioBlob.size > 0 ? audioBlob : null)
      }

      try {
        recorder.stop()
      } catch {
        stopTracks()
        setIsRecording(false)
        resolve(null)
      }
    })
  }, [stopTracks])

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        // ignore
      }
    }
    chunksRef.current = []
    stopTracks()
    setIsRecording(false)
    setRecordingDuration(0)
  }, [stopTracks])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks()
    }
  }, [stopTracks])

  return {
    isRecording,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
