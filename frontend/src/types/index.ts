export type ToneOption = 'neutral' | 'formal' | 'concise' | 'email' | 'prompt'

export interface ToneDefinition {
  id: ToneOption
  label: string
  description: string
  badgeColor: string
}

export const TONE_DEFINITIONS: Record<ToneOption, ToneDefinition> = {
  neutral: {
    id: 'neutral',
    label: 'Estándar',
    description: 'Natural, equilibrado y con ortografía perfecta',
    badgeColor: '#3b82f6',
  },
  formal: {
    id: 'formal',
    label: 'Formal',
    description: 'Profesional, académico y sintaxis elegante',
    badgeColor: '#8b5cf6',
  },
  concise: {
    id: 'concise',
    label: 'Conciso',
    description: 'Directo al grano, sin redundancias ni relleno',
    badgeColor: '#10b981',
  },
  email: {
    id: 'email',
    label: 'Correo',
    description: 'Formato email con asunto, saludo y despedida',
    badgeColor: '#f59e0b',
  },
  prompt: {
    id: 'prompt',
    label: 'Prompt IA',
    description: 'Ingeniería de prompt optimizado con instrucciones claras',
    badgeColor: '#ec4899',
  },
}

export interface TranscriptionResponse {
  text: string
  duration: number
}

export interface ImproveRequest {
  text: string
  tone: ToneOption
}

export interface ImproveResponse {
  improved_text: string
  tone: ToneOption
}

export interface CreateHistoryPayload {
  original_text: string
  improved_text: string
  tone: ToneOption
}

export interface HistoryItem {
  id: number
  original_text: string
  improved_text: string
  tone: string
  created_at: string
}

export interface DeleteHistoryResponse {
  message: string
  id: number
}
