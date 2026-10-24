export type QualityPreset = 'balanced' | 'high' | 'battery'
export type ViewSettings = { preset: QualityPreset; sharp: boolean }
export const DEFAULT_VIEW_SETTINGS: ViewSettings = { preset: 'balanced', sharp: false }

export const QUALITY_PRESETS = {
  balanced: { label: 'Balanced', description: 'Adapts detail for smooth exploration.', min: .7, max: 1.15, initial: 1 },
  high: { label: 'High', description: 'Finer detail; may feel less smooth.', min: 1, max: 1.15, initial: 1.15 },
  battery: { label: 'Battery saver', description: 'Lighter rendering with less fine detail.', min: .7, max: .85, initial: .8 },
} as const
