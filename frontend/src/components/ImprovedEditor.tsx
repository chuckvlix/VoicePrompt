import React, { useState } from 'react'
import { Bookmark, Check, Copy, Sparkles } from 'lucide-react'
import type { ToneOption } from '../types'
import { TONE_DEFINITIONS } from '../types'

interface ImprovedEditorProps {
  improvedText: string
  onChangeText: (newText: string) => void
  appliedTone: ToneOption | null
  originalText: string
  onSave: () => Promise<void>
  isSaving: boolean
  isImproving: boolean
}

export const ImprovedEditor: React.FC<ImprovedEditorProps> = ({
  improvedText,
  onChangeText,
  appliedTone,
  originalText,
  onSave,
  isSaving,
  isImproving,
}) => {
  const [copied, setCopied] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleCopy = async () => {
    if (!improvedText) return
    try {
      await navigator.clipboard.writeText(improvedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleSave = async () => {
    if (!improvedText.trim() || !originalText.trim() || isSaving) return
    await onSave()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  const toneDef = appliedTone ? TONE_DEFINITIONS[appliedTone] : null
  const wordCount = improvedText.trim() ? improvedText.trim().split(/\s+/).length : 0
  const charCount = improvedText.length

  const originalWordCount = originalText.trim() ? originalText.trim().split(/\s+/).length : 0
  const wordDiff = wordCount - originalWordCount

  return (
    <div className="card editor-card improved-card">
      <div className="card-header">
        <div className="card-title-group">
          <label htmlFor="improved-input" className="card-title">
            2. Versión mejorada
          </label>
          {toneDef ? (
            <span
              className="card-badge tone-active-badge"
              style={{ backgroundColor: `${toneDef.badgeColor}22`, color: toneDef.badgeColor, borderColor: `${toneDef.badgeColor}44` }}
            >
              {toneDef.label}
            </span>
          ) : (
            <span className="card-badge">Esperando mejora</span>
          )}
        </div>
        <div className="card-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={handleCopy}
            disabled={!improvedText}
            title="Copiar texto mejorado"
            aria-label="Copiar texto mejorado"
          >
            {copied ? (
              <Check size={16} className="text-success" aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            <span className="btn-icon-label">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      <div className="editor-body">
        {isImproving ? (
          <div className="improving-placeholder">
            <Sparkles className="animate-pulse" size={28} />
            <p>LM Studio está refinando el texto con el tono seleccionado...</p>
          </div>
        ) : (
          <textarea
            id="improved-input"
            className="text-input"
            value={improvedText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Aquí aparecerá el texto mejorado por LM Studio en el tono elegido. Podrás editarlo libremente antes de guardarlo o copiarlo."
            rows={7}
            spellCheck
          />
        )}
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <span>{wordCount} palabras</span>
          <span className="dot-divider">•</span>
          <span>{charCount} caracteres</span>
          {originalWordCount > 0 && wordCount > 0 && (
            <span className="diff-badge" title="Diferencia de palabras respecto al original">
              {wordDiff > 0 ? `+${wordDiff}` : wordDiff} palabras
            </span>
          )}
        </div>

        <div className="action-button-container">
          <button
            type="button"
            className={`btn btn-save ${savedSuccess ? 'btn-success' : 'btn-secondary'}`}
            onClick={handleSave}
            disabled={!improvedText.trim() || !originalText.trim() || isSaving || isImproving}
            title="Guardar versión original y mejorada en SQLite"
          >
            {savedSuccess ? (
              <>
                <Check size={17} aria-hidden="true" />
                <span>¡Guardado en el historial!</span>
              </>
            ) : isSaving ? (
              <>
                <span className="spinner-sm" aria-hidden="true" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Bookmark size={17} aria-hidden="true" />
                <span>Guardar en historial</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
