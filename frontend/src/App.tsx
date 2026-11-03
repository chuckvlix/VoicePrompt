import { useCallback, useEffect, useState } from 'react'
import {
  AudioRecorder,
} from './components/AudioRecorder'
import { HistoryList } from './components/HistoryList'
import { ImprovedEditor } from './components/ImprovedEditor'
import { NotificationToast, type ToastMessage } from './components/NotificationToast'
import { TranscriptionEditor } from './components/TranscriptionEditor'
import {
  checkBackendHealth,
  deleteHistoryItem,
  fetchHistory,
  improveText,
  saveHistoryItem,
  transcribeAudio,
} from './services/api'
import type { HistoryItem, ToneOption } from './types'
import { History, Mic, Sparkles } from 'lucide-react'
import './App.css'

export function App() {
  const [originalText, setOriginalText] = useState('')
  const [improvedText, setImprovedText] = useState('')
  const [selectedTone, setSelectedTone] = useState<ToneOption>('neutral')
  const [appliedTone, setAppliedTone] = useState<ToneOption | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null)

  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Check health and load history on mount
  useEffect(() => {
    async function init() {
      const healthy = await checkBackendHealth()
      setIsBackendHealthy(healthy)
      if (healthy) {
        try {
          const items = await fetchHistory()
          setHistoryItems(items)
        } catch {
          // ignore initial history load error
        }
      }
    }
    init()
  }, [])

  // Handle transcribed audio
  const handleAudioCaptured = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const response = await transcribeAudio(audioBlob)
      if (response.text.trim()) {
        setOriginalText((prev) => (prev ? `${prev} ${response.text}` : response.text))
        setAudioDuration(response.duration)
        addToast('Audio transcrito con éxito por faster-whisper', 'success')
      } else {
        addToast('No se detectó voz clara en la grabación. Intenta hablar más cerca del micrófono.', 'info')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error durante la transcripción de audio.'
      addToast(msg, 'error')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Handle text improvement via LM Studio
  const handleImprove = async () => {
    if (!originalText.trim()) return

    setIsImproving(true)
    try {
      const response = await improveText(originalText, selectedTone)
      setImprovedText(response.improved_text)
      setAppliedTone(response.tone)
      addToast('Texto mejorado correctamente con LM Studio', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al comunicarse con LM Studio.'
      addToast(msg, 'error')
    } finally {
      setIsImproving(false)
    }
  }

  // Handle saving to SQLite history
  const handleSaveToHistory = async () => {
    if (!originalText.trim() || !improvedText.trim()) return

    setIsSaving(true)
    try {
      const newItem = await saveHistoryItem({
        original_text: originalText,
        improved_text: improvedText,
        tone: appliedTone || selectedTone,
      })
      setHistoryItems((prev) => [newItem, ...prev])
      addToast('Guardado permanentemente en la base de datos SQLite', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar en el historial.'
      addToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Restore entry from history into editors
  const handleRestore = (item: HistoryItem) => {
    setOriginalText(item.original_text)
    setImprovedText(item.improved_text)
    if (item.tone && ['neutral', 'formal', 'concise', 'email', 'prompt'].includes(item.tone)) {
      setSelectedTone(item.tone as ToneOption)
      setAppliedTone(item.tone as ToneOption)
    }
    setAudioDuration(null)
    addToast('Entrada restaurada en los editores de trabajo', 'info')
  }

  // Delete history item
  const handleDeleteHistory = async (id: number) => {
    try {
      await deleteHistoryItem(id)
      setHistoryItems((prev) => prev.filter((i) => i.id !== id))
      addToast('Elemento eliminado del historial', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar del historial.'
      addToast(msg, 'error')
    }
  }

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast('Texto copiado al portapapeles', 'success')
    } catch {
      addToast('No se pudo acceder al portapapeles', 'error')
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <div className="logo-icon">
            <Mic size={22} className="logo-mic" />
            <Sparkles size={14} className="logo-sparkle" />
          </div>
          <div>
            <h1 className="brand-title">VoicePrompt</h1>
            <p className="brand-subtitle">
              Dictado inteligente en español con faster-whisper y LM Studio
            </p>
          </div>
        </div>

        <div className="header-actions">
          {isBackendHealthy !== null && (
            <div
              className={`status-pill ${isBackendHealthy ? 'status-online' : 'status-offline'}`}
              title={
                isBackendHealthy
                  ? 'Backend conectado en http://localhost:8000'
                  : 'Backend desconectado o no accesible'
              }
            >
              <span className="status-dot" />
              <span>{isBackendHealthy ? 'Servidor activo' : 'Servidor desconectado'}</span>
            </div>
          )}

          <button
            type="button"
            className="history-toggle-btn"
            onClick={() => setIsHistoryOpen(true)}
            aria-label={`Abrir historial (${historyItems.length} guardados)`}
          >
            <History size={17} aria-hidden="true" />
            <span>Historial</span>
            {historyItems.length > 0 && (
              <span className="history-badge">{historyItems.length}</span>
            )}
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* Voice recording section */}
        <section className="recorder-section" aria-label="Grabación de voz">
          <AudioRecorder
            isTranscribing={isTranscribing}
            onAudioCaptured={handleAudioCaptured}
            disabled={isImproving}
          />
        </section>

        {/* Dual stage editors */}
        <div className="editors-grid">
          <TranscriptionEditor
            text={originalText}
            onChangeText={setOriginalText}
            selectedTone={selectedTone}
            onSelectTone={setSelectedTone}
            onImprove={handleImprove}
            isImproving={isImproving}
            audioDuration={audioDuration}
          />

          <ImprovedEditor
            improvedText={improvedText}
            onChangeText={setImprovedText}
            appliedTone={appliedTone}
            originalText={originalText}
            onSave={handleSaveToHistory}
            isSaving={isSaving}
            isImproving={isImproving}
          />
        </div>
      </main>

      {/* History modal */}
      <HistoryList
        items={historyItems}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={handleRestore}
        onDelete={handleDeleteHistory}
        onCopyText={handleCopyText}
      />

      {/* Toast notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
