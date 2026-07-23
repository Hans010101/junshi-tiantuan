export type ReportMode = 'ai' | 'fallback' | 'safety'

export interface Perspective {
  personaId: string
  personaName: string
  headline: string
  analysis: string
  question: string
  modelName?: string
}

export interface ProblemAnalysis {
  decisionGoal: string
  coreTension: string
  constraints: string[]
  assumptions: string[]
  successCriteria: string[]
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
  deepAnalysis?: ProblemAnalysis
  perspectives: Perspective[]
  synthesis: string
  consensus?: string[]
  disagreements?: string[]
  options: DecisionOption[]
  actions: string[]
  risks?: string[]
  disclaimer: string
}
