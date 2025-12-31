import type { ForestPlotData, PlotConfig } from '@/types'

export function generateForestPlotCode(
  data: ForestPlotData[],
  config: PlotConfig
): string {
  if (data.length === 0) {
    throw new Error('No data provided for plot generation')
  }

  // Branch based on layout style
  if (config.layoutStyle === 'modern') {
    return generateGgplot2Code(data, config)
  } else {
    return generateMetaForestCode(data, config)
  }
}

// ========== Classic Layout (meta::forest) Functions ==========

function generateMetaForestCode(
  data: ForestPlotData[],
  config: PlotConfig
): string {
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

  // Configure columns based on showValues setting
  let leftCols = 'c("studlab")'
  let leftLabs = 'c("Study")'
  let rightCols: string
  let rightLabs: string

  if (config.showValues) {
    // Show effect and CI on the right
    rightCols = 'c("effect", "ci")'
    rightLabs = `c("${config.effectMeasure}", "95% CI")`
  } else {
    // Don't show values
    rightCols = 'FALSE'
    rightLabs = ''
  }

  // Determine reference line value based on effect measure
  const refValue = getNoEffectValue(config.effectMeasure)

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
  test.overall = ${config.showMetadata ? 'TRUE' : 'FALSE'},
  print.I2 = ${config.showMetadata ? 'TRUE' : 'FALSE'},
  spacing = 1.5,
  just.studlab = "left",
  just.addcols = "center",
  fontsize = 10,
  ref = ${refValue}${xlimCode}
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

function getNoEffectValue(effectMeasure: string): number {
  // For ratio measures (RR, OR, HR), no effect is at 1
  // For difference measures (MD, SMD), no effect is at 0
  if (['RR', 'OR', 'HR'].includes(effectMeasure)) {
    return 1
  } else {
    return 0
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

// ========== ggplot2 (Modern Layout) Functions ==========

function generateGgplot2Code(data: ForestPlotData[], config: PlotConfig): string {
  const dataFrame = buildGgplot2DataFrame(data)
  const plotCode = buildGgplot2PlotCode(data, config)

  return `
# Load required libraries
library(ggplot2)

# Create data frame
${dataFrame}

# Generate ggplot2 forest plot
${plotCode}
`
}

function buildGgplot2DataFrame(data: ForestPlotData[]): string {
  const studies = data.map(d => `"${d.study.replace(/"/g, '\\"')}"`).join(', ')
  const effects = data.map(d => d.effect).join(', ')
  const ciLowers = data.map(d => d.ci_lower).join(', ')
  const ciUppers = data.map(d => d.ci_upper).join(', ')

  return `
dat <- data.frame(
  study = c(${studies}),
  effect = c(${effects}),
  ci_lower = c(${ciLowers}),
  ci_upper = c(${ciUppers}),
  stringsAsFactors = FALSE
)

# Reverse order for top-to-bottom display
dat$study <- factor(dat$study, levels = rev(dat$study))
`
}

function buildGgplot2PlotCode(data: ForestPlotData[], config: PlotConfig): string {
  const refValue = getNoEffectValue(config.effectMeasure)

  // Combine title and subtitle with newline
  const titleLine = config.subtitle
    ? `ggtitle("${config.title}\\n${config.subtitle}")`
    : config.title
    ? `ggtitle("${config.title}")`
    : ''

  const scaleCode = buildGgplot2Scale(config)
  const xlimCode = buildGgplot2Limits(data, config)

  // Label code conditional on showValues
  const labelCode = config.showValues ? `
  dat$label <- sprintf("%.2f\\n(%.2f–%.2f)", dat$effect, dat$ci_lower, dat$ci_upper)
` : ''

  const labelGeom = config.showValues ? `
  geom_text(aes(label = label), position = position_nudge(y = -0.25), vjust = 1, size = 3.3) +` : ''

  const pointColor = getGgplot2Color(config.colorScheme)
  const xlab = config.xLabel || getDefaultXLabel(config.effectMeasure, config.axisType)

  return `
${labelCode}
p <- ggplot(dat, aes(x = effect, y = study)) +
  geom_vline(xintercept = ${refValue}, linetype = "dashed", color = "grey50") +
  geom_point(size = ${config.pointSize}, color = "${pointColor}") +
  geom_errorbar(aes(xmin = ci_lower, xmax = ci_upper), width = 0, linewidth = 0.7, color = "${pointColor}") +
  ${scaleCode}${xlimCode ? `\n  ${xlimCode} +` : ''}
  xlab("${xlab}") +
  ylab(NULL) +${labelGeom}
  coord_cartesian(clip = "off") +
  theme_bw(base_size = 13) +
  theme(
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_line(linewidth = 0.3, colour = "grey80"),
    plot.margin = margin(t = 5.5, r = 10, b = 20, l = 10),
    axis.title.x = element_text(margin = margin(t = 8)),
    axis.text.y = element_text(margin = margin(r = 5))
  )${titleLine ? `\n\np <- p + ${titleLine}` : ''}

print(p)
`
}

function buildGgplot2Scale(config: PlotConfig): string {
  switch (config.axisType) {
    case 'linear': return 'scale_x_continuous() +'
    case 'log2': return 'scale_x_continuous(trans = "log2") +'
    case 'loge': return 'scale_x_continuous(trans = "log") +'
    case 'log10': return 'scale_x_log10() +'
    default: return 'scale_x_continuous() +'
  }
}

function buildGgplot2Limits(data: ForestPlotData[], config: PlotConfig): string | null {
  if (config.xLimits !== 'auto') {
    return `scale_x_continuous(limits = c(${config.xLimits[0]}, ${config.xLimits[1]}))`
  }

  // Auto limits with padding (÷1.3, ×1.3)
  const allValues = data.flatMap(d => [d.ci_lower, d.effect, d.ci_upper])
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const xMin = minVal / 1.3
  const xMax = maxVal * 1.3

  return `scale_x_continuous(limits = c(${xMin.toFixed(4)}, ${xMax.toFixed(4)}))`
}

function getGgplot2Color(scheme: string): string {
  switch (scheme) {
    case 'monochrome': return 'black'
    case 'colorblind': return '#0072B2'
    case 'dark': return '#2E4057'
    case 'light': return '#87CEEB'
    default: return '#1E88E5'
  }
}

function getDefaultXLabel(effectMeasure: string, axisType: string): string {
  const measureLabel = effectMeasure === 'RR' ? 'Risk Ratio' :
                       effectMeasure === 'OR' ? 'Odds Ratio' :
                       effectMeasure === 'HR' ? 'Hazard Ratio' :
                       effectMeasure === 'MD' ? 'Mean Difference' :
                       effectMeasure === 'SMD' ? 'Standardized Mean Difference' :
                       'Effect Size'

  const scaleLabel = axisType !== 'linear' ? ' (log scale)' : ''
  return `${measureLabel}${scaleLabel}`
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
