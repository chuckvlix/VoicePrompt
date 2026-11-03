import React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const NotificationToast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-label="Notificaciones del sistema">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-${toast.type}`} role="alert">
          <div className="toast-icon">
            {toast.type === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
            {toast.type === 'error' && <AlertCircle size={18} aria-hidden="true" />}
            {toast.type === 'info' && <Info size={18} aria-hidden="true" />}
          </div>
          <div className="toast-content">
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar notificación"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
