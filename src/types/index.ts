export interface ForestPlotData {
  outcome: string
  value?: number
  ci_lower?: number
  ci_upper?: number
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

export type AxisType = 'linear' | 'log2' | 'loge' | 'log10'
export type DPI = 72 | 150 | 300 | 600

export interface PlotConfig {
  axisType: AxisType
  xLimits: [number, number] | 'auto'
  xBreaks: number[] | 'auto'
  title: string
  subtitle: string
  xLabel: string
  yLabel: string
  dpi: DPI
  pointSize: number
  colorScheme: string
  showValues: boolean
  showGridLines: boolean
  referenceLineValue: number | null
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
  axisType: 'linear',
  xLimits: 'auto',
  xBreaks: 'auto',
  title: 'Forest Plot',
  subtitle: '',
  xLabel: 'Value',
  yLabel: 'Outcome',
  dpi: 300,
  pointSize: 3,
  colorScheme: 'monochrome',
  showValues: true,
  showGridLines: false,
  referenceLineValue: 1,
  width: 'auto',
  height: 'auto',
}
