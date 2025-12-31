export interface ForestPlotData {
  study: string
  effect: number
  ci_lower: number
  ci_upper: number
  weight?: number
}

export interface ParsedData {
  data: ForestPlotData[]
  errors: string[]
  warnings: string[]
}

export interface DataVersion {
  id: string
  name: string
  timestamp: Date
  data: ForestPlotData[]
}

export type LayoutStyle = 'classic' | 'modern'
export type AxisType = 'linear' | 'log2' | 'loge' | 'log10'
export type EffectMeasure = 'RR' | 'OR' | 'HR' | 'MD' | 'SMD'
export type DPI = 72 | 150 | 300 | 600

export interface PlotConfig {
  layoutStyle: LayoutStyle
  axisType: AxisType
  xLimits: [number, number] | 'auto'
  title: string
  subtitle: string
  xLabel: string
  yLabel: string
  dpi: DPI
  effectMeasure: EffectMeasure
  pointSize: number
  colorScheme: string
  showWeights: boolean
  showValues: boolean
  showMetadata: boolean
  width: number | 'auto'
  height: number | 'auto'
}

export interface Session {
  id: string
  name: string
  created: Date
  modified: Date
  dataVersions: DataVersion[]
  config: PlotConfig
  generatedCode: string
}

export const defaultPlotConfig: PlotConfig = {
  layoutStyle: 'classic',
  axisType: 'linear',
  xLimits: 'auto',
  title: 'Forest Plot',
  subtitle: '',
  xLabel: 'Effect Size',
  yLabel: 'Study',
  dpi: 300,
  effectMeasure: 'RR',
  pointSize: 3,
  colorScheme: 'default',
  showWeights: true,
  showValues: true,
  showMetadata: false,
  width: 'auto',
  height: 'auto',
}
