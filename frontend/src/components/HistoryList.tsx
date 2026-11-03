import React, { useEffect, useRef, useState } from 'react'
import {
  Clock,
  Copy,
  History,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { HistoryItem } from '../types'
import { TONE_DEFINITIONS } from '../types'

interface HistoryListProps {
  items: HistoryItem[]
  isOpen: boolean
  onClose: () => void
  onRestore: (item: HistoryItem) => void
  onDelete: (id: number) => Promise<void>
  onCopyText: (text: string) => void
}

function formatDate(dateStr: string): string {
  try {
    const normalized = dateStr.includes('T')
      ? (dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`)
      : `${dateStr.replace(' ', 'T')}Z`
    const date = new Date(normalized)
    if (isNaN(date.getTime())) {
      return dateStr
    }
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isOpen,
  onClose,
  onRestore,
  onDelete,
  onCopyText,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.original_text.toLowerCase().includes(q) ||
      item.improved_text.toLowerCase().includes(q) ||
      item.tone.toLowerCase().includes(q)
    )
  })

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="history-modal"
      aria-labelledby="history-modal-title"
      onClick={handleBackdropClick}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      {...({ closedby: 'any' } as any)}
    >
      <div className="history-modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title-group">
            <History size={20} aria-hidden="true" />
            <h2 id="history-modal-title" className="history-title">
              Historial de textos guardados ({items.length})
            </h2>
          </div>
          <button
            type="button"
            className="history-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel de historial"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="history-search-bar">
            <Search size={16} className="search-icon" aria-hidden="true" />
            <input
              type="search"
              className="history-search-input"
              placeholder="Buscar en el historial por texto o tono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar en historial"
            />
          </div>
        )}

        <div className="history-body">
          {items.length === 0 ? (
            <div className="history-empty">
              <History size={40} className="empty-icon" aria-hidden="true" />
              <p className="empty-title">Sin entradas en el historial</p>
              <p className="empty-subtitle">
                Cuando mejores un texto con el tono que prefieras y presiones &quot;Guardar en historial&quot;, se almacenará aquí de forma permanente en SQLite.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="history-empty">
              <p className="empty-title">No hay coincidencias</p>
              <p className="empty-subtitle">
                No se encontraron entradas que coincidan con &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            <ul className="history-cards-list">
              {filteredItems.map((item) => {
                const toneDef = TONE_DEFINITIONS[item.tone as keyof typeof TONE_DEFINITIONS]
                const toneLabel = toneDef ? toneDef.label : item.tone

                return (
                  <li key={item.id} className="history-card-item">
                    <div className="history-card-top">
                      <div className="history-card-meta">
                        <span className="history-tone-badge">
                          {toneLabel}
                        </span>
                        <span className="history-date">
                          <Clock size={12} aria-hidden="true" />
                          <span>{formatDate(item.created_at)}</span>
                        </span>
                      </div>
                      <div className="history-card-actions">
                        <button
                          type="button"
                          className="history-action-btn"
                          onClick={() => {
                            onRestore(item)
                            onClose()
                          }}
                          title="Restaurar en los editores"
                          aria-label="Restaurar texto en los editores"
                        >
                          <RotateCcw size={14} aria-hidden="true" />
                          <span>Restaurar</span>
                        </button>
                        <button
                          type="button"
                          className="history-action-btn"
                          onClick={() => onCopyText(item.improved_text)}
                          title="Copiar versión mejorada"
                          aria-label="Copiar texto mejorado"
                        >
                          <Copy size={14} aria-hidden="true" />
                          <span>Copiar</span>
                        </button>
                        <button
                          type="button"
                          className="history-action-btn delete-btn"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          title="Eliminar de la base de datos"
                          aria-label="Eliminar entrada del historial"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="history-card-content">
                      <div className="history-column original-col">
                        <span className="column-label">Original:</span>
                        <p className="column-text">{item.original_text}</p>
                      </div>
                      <div className="history-column improved-col">
                        <span className="column-label">Mejorado:</span>
                        <p className="column-text">{item.improved_text}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  )
}
