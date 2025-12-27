import type { ForestPlotData, PlotConfig } from '@/types'

export function generateForestPlotCode(
  data: ForestPlotData[],
  config: PlotConfig
): string {
  if (data.length === 0) {
    throw new Error('No data provided for plot generation')
  }

  // Build data frame
  const dataFrame = buildDataFrame(data)

  // Build plot code based on configuration
  const plotCode = buildPlotCode(config)

  // Combine into complete R script
  return `
# Load required libraries
library(meta)
library(metafor)
library(grid)

# Create data frame
${dataFrame}

# Generate forest plot
${plotCode}
`
}

function buildDataFrame(data: ForestPlotData[]): string {
  const studies = data.map(d => `"${d.study.replace(/"/g, '\\"')}"`).join(', ')
  const effects = data.map(d => d.effect).join(', ')
  const ciLowers = data.map(d => d.ci_lower).join(', ')
  const ciUppers = data.map(d => d.ci_upper).join(', ')
  const weights = data.map(d => d.weight ?? 'NA').join(', ')

  return `
data <- data.frame(
  study = c(${studies}),
  effect = c(${effects}),
  ci_lower = c(${ciLowers}),
  ci_upper = c(${ciUppers}),
  weight = c(${weights}),
  stringsAsFactors = FALSE
)

# Calculate standard errors from confidence intervals
# Assuming 95% CI: SE = (upper - lower) / (2 * 1.96)
data$se <- (data$ci_upper - data$ci_lower) / (2 * 1.96)
`
}

function buildPlotCode(config: PlotConfig): string {
  const xlab = config.xLabel || 'Effect Size'
  const title = config.title || 'Forest Plot'
  const subtitle = config.subtitle || ''

  // Determine axis limits
  let xlimCode = ''
  if (config.xLimits !== 'auto') {
    xlimCode = `, xlim = c(${config.xLimits[0]}, ${config.xLimits[1]})`
  }

  // Determine if log scale
  const logScale = config.axisType !== 'linear'
  const logBase = getLogBase(config.axisType)

  // Build meta-analysis object
  let metaCode = ''
  if (logScale) {
    metaCode = `
# For ratio measures, work on log scale
data$log_effect <- log(data$effect, base = ${logBase})
data$log_ci_lower <- log(data$ci_lower, base = ${logBase})
data$log_ci_upper <- log(data$ci_upper, base = ${logBase})

# Create meta object
m <- metagen(
  TE = log_effect,
  seTE = se,
  studlab = study,
  data = data,
  sm = "${config.effectMeasure}",
  fixed = TRUE,
  random = TRUE
)
`
  } else {
    metaCode = `
# Create meta object
m <- metagen(
  TE = effect,
  seTE = se,
  studlab = study,
  data = data,
  sm = "${config.effectMeasure}",
  fixed = TRUE,
  random = TRUE
)
`
  }

  // Build forest plot call
  // Note: forest() uses grid graphics, so we use its parameters for titles
  const mainTitle = subtitle ? `${title}\n${subtitle}` : title

  // Configure columns based on showWeights setting
  let leftCols = 'c("studlab")'
  let leftLabs = 'c("Study")'
  let rightCols = 'c("effect", "ci")'
  let rightLabs = `c("${config.effectMeasure}", "95% CI")`

  if (config.showWeights) {
    // Show effect and CI on the left when weights are shown
    leftCols = 'c("studlab", "effect", "ci")'
    leftLabs = 'c("Study", "Effect", "95% CI")'
    rightCols = 'FALSE'
    rightLabs = ''
  }

  const forestCode = `
# Generate forest plot
forest(
  m,
  xlab = "${xlab}",
  smlab = "${mainTitle}",
  leftcols = ${leftCols},
  leftlabs = ${leftLabs},
  rightcols = ${rightCols},${rightLabs ? `\n  rightlabs = ${rightLabs},` : ''}
  digits = 2,
  col.square = "${getColorScheme(config.colorScheme)}",
  col.diamond = "blue",
  cex = ${config.pointSize / 3},
  test.overall = TRUE,
  print.I2 = TRUE${xlimCode}
)
`

  return metaCode + forestCode
}

function getLogBase(axisType: string): number {
  switch (axisType) {
    case 'log2': return 2
    case 'loge': return Math.E
    case 'log10': return 10
    default: return Math.E
  }
}

function getColorScheme(scheme: string): string {
  switch (scheme) {
    case 'monochrome': return 'black'
    case 'colorblind': return '#0072B2'
    case 'dark': return '#2E4057'
    case 'light': return '#87CEEB'
    default: return '#1E88E5'
  }
}

export function validateData(data: ForestPlotData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.length === 0) {
    errors.push('No data provided')
    return { valid: false, errors }
  }

  data.forEach((row, idx) => {
    if (!row.study || row.study.trim() === '') {
      errors.push(`Row ${idx + 1}: Study name is required`)
    }
    if (isNaN(row.effect)) {
      errors.push(`Row ${idx + 1}: Effect size must be a valid number`)
    }
    if (isNaN(row.ci_lower)) {
      errors.push(`Row ${idx + 1}: Lower CI must be a valid number`)
    }
    if (isNaN(row.ci_upper)) {
      errors.push(`Row ${idx + 1}: Upper CI must be a valid number`)
    }
    if (row.ci_lower >= row.ci_upper) {
      errors.push(`Row ${idx + 1}: Lower CI must be less than Upper CI`)
    }
  })

  return { valid: errors.length === 0, errors }
}
