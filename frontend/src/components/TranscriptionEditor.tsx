import React, { useState } from 'react'
import { Check, Clock, Copy, Sparkles, Trash2 } from 'lucide-react'
import type { ToneOption } from '../types'
import { ToneSelector } from './ToneSelector'
import { copyToClipboard } from '../utils/clipboard'

interface TranscriptionEditorProps {
  text: string
  onChangeText: (newText: string) => void
  selectedTone: ToneOption
  onSelectTone: (tone: ToneOption) => void
  onImprove: () => Promise<void>
  isImproving: boolean
  audioDuration: number | null
}

export const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  text,
  onChangeText,
  selectedTone,
  onSelectTone,
  onImprove,
  isImproving,
  audioDuration,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    onChangeText('')
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length

  return (
    <div className="card editor-card">
      <div className="card-header">
        <div className="card-title-group">
          <label htmlFor="transcription-input" className="card-title">
            1. Transcripción original
          </label>
          <span className="card-badge">Borrador</span>
        </div>
        <div className="card-actions">
          {audioDuration !== null && audioDuration > 0 && (
            <span className="audio-stat" title="Duración del audio procesado">
              <Clock size={13} aria-hidden="true" />
              <span>{audioDuration.toFixed(1)}s audio</span>
            </span>
          )}
          <button
            type="button"
            className="btn-icon"
            onClick={handleCopy}
            disabled={!text}
            title="Copiar texto original"
            aria-label="Copiar texto original"
          >
            {copied ? (
              <Check size={16} className="text-success" aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            <span className="btn-icon-label">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={handleClear}
            disabled={!text}
            title="Limpiar texto"
            aria-label="Limpiar texto"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span className="btn-icon-label">Limpiar</span>
          </button>
        </div>
      </div>

      <div className="editor-body">
        <textarea
          id="transcription-input"
          className="text-input"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Dicta con tu voz usando el micrófono o escribe aquí directamente en español..."
          rows={7}
          spellCheck
        />
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <span>{wordCount} palabras</span>
          <span className="dot-divider">•</span>
          <span>{charCount} caracteres</span>
        </div>

        <ToneSelector
          selectedTone={selectedTone}
          onSelectTone={onSelectTone}
          disabled={isImproving}
        />

        <div className="action-button-container">
          <button
            type="button"
            className="btn btn-primary btn-improve"
            onClick={onImprove}
            disabled={!text.trim() || isImproving}
          >
            {isImproving ? (
              <>
                <span className="spinner-sm" aria-hidden="true" />
                <span>Mejorando con LM Studio...</span>
              </>
            ) : (
              <>
                <span className="btn-improve-icon" aria-hidden="true">
                  <Sparkles size={14} />
                </span>
                <span>Mejorar redacción</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
