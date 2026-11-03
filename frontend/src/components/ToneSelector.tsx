import React from 'react'
import type { ToneOption } from '../types'
import { TONE_DEFINITIONS } from '../types'
import { Mail, MessageSquare, Sparkles, Terminal, Wand2 } from 'lucide-react'

interface ToneSelectorProps {
  selectedTone: ToneOption
  onSelectTone: (tone: ToneOption) => void
  disabled?: boolean
}

const TONE_ICONS: Record<ToneOption, React.ReactNode> = {
  neutral: <MessageSquare size={15} aria-hidden="true" />,
  formal: <Sparkles size={15} aria-hidden="true" />,
  concise: <Wand2 size={15} aria-hidden="true" />,
  email: <Mail size={15} aria-hidden="true" />,
  prompt: <Terminal size={15} aria-hidden="true" />,
}

export const ToneSelector: React.FC<ToneSelectorProps> = ({
  selectedTone,
  onSelectTone,
  disabled = false,
}) => {
  const tones = Object.values(TONE_DEFINITIONS)

  return (
    <div className="tone-selector-group" role="radiogroup" aria-label="Seleccionar tono de mejora">
      <div className="tone-selector-header">
        <span className="tone-selector-label">Tono de redacción:</span>
        <span className="tone-current-desc">
          {TONE_DEFINITIONS[selectedTone]?.description}
        </span>
      </div>
      <div className="tone-pills">
        {tones.map((t) => {
          const isSelected = selectedTone === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelectTone(t.id)}
              className={`tone-pill ${isSelected ? 'active' : ''}`}
            >
              <span className="tone-pill-icon">{TONE_ICONS[t.id]}</span>
              <span className="tone-pill-text">{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
