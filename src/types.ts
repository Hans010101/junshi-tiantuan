export type ReportMode = 'ai' | 'fallback' | 'safety'

export interface Perspective {
  personaId: string
  personaName: string
  headline: string
  analysis: string
  question: string
}
export interface DecisionOption {
  title: string
  upside: string
  risk: string
  firstStep: string
}

export interface AdviceReport {
  id: string
  createdAt: string
  question: string
  mode: ReportMode
  title: string
  diagnosis: string
  perspectives: Perspective[]
  synthesis: string
  options: DecisionOption[]
  actions: string[]
  disclaimer: string
}
