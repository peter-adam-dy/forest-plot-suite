import type { ForestPlotData, PlotConfig } from '@/types'

export function generateForestPlotCode(
  data: ForestPlotData[],
  config: PlotConfig
): string {
  if (data.length === 0) {
    throw new Error('No data provided for plot generation')
  }

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
  const outcomes = data.map(d => `"${d.outcome.replace(/"/g, '\\"')}"`).join(', ')
  const values = data.map(d => d.value).join(', ')
  const ciLowers = data.map(d => d.ci_lower).join(', ')
  const ciUppers = data.map(d => d.ci_upper).join(', ')

  return `
dat <- data.frame(
  outcome = c(${outcomes}),
  value = c(${values}),
  ci_lower = c(${ciLowers}),
  ci_upper = c(${ciUppers}),
  stringsAsFactors = FALSE
)

# Reverse order for top-to-bottom display
dat$outcome <- factor(dat$outcome, levels = rev(dat$outcome))
`
}

function buildGgplot2PlotCode(data: ForestPlotData[], config: PlotConfig): string {
  // Combine title and subtitle with newline
  const titleLine = config.subtitle
    ? `ggtitle("${config.title}\\n${config.subtitle}")`
    : config.title
    ? `ggtitle("${config.title}")`
    : ''

  const scaleCode = buildGgplot2Scale(data, config)

  // Label code conditional on showValues
  const labelCode = config.showValues ? `
  dat$label <- sprintf("%.2f\\n(%.2f–%.2f)", dat$value, dat$ci_lower, dat$ci_upper)
` : ''

  const labelGeom = config.showValues ? `
  geom_text(aes(label = label), position = position_nudge(y = -0.12), vjust = 1, size = 3.3) +` : ''

  // Increase bottom margin when showing values to prevent overlap
  const bottomMargin = config.showValues ? 35 : 20

  const pointColor = getGgplot2Color(config.colorScheme)
  const xlab = config.xLabel || 'Value'

  // Check if reference line should be shown (not null and not undefined)
  const hasReferenceLine = config.referenceLineValue !== null && config.referenceLineValue !== undefined

  // Reference line: only show if explicitly set
  const refLine = hasReferenceLine
    ? `geom_vline(xintercept = ${config.referenceLineValue}, linetype = "dashed", color = "grey50") +\n  `
    : ''

  // Grid lines: show based on showGridLines setting (independent of reference line)
  const gridLineStyle = (config.showGridLines ?? false)
    ? 'element_line(linewidth = 0.3, colour = "grey80")'
    : 'element_blank()'

  return `
${labelCode}
p <- ggplot(dat, aes(x = value, y = outcome)) +
  ${refLine}geom_point(size = ${config.pointSize}, color = "${pointColor}") +
  geom_errorbar(aes(xmin = ci_lower, xmax = ci_upper), width = 0, linewidth = 0.7, color = "${pointColor}") +
  ${scaleCode}
  xlab("${xlab}") +
  ylab(NULL) +${labelGeom}
  coord_cartesian(clip = "off") +
  theme_bw(base_size = 13) +
  theme(
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = ${gridLineStyle},
    plot.margin = margin(t = 5.5, r = 10, b = ${bottomMargin}, l = 10),
    axis.title.x = element_text(margin = margin(t = 8)),
    axis.text.y = element_text(margin = margin(r = 5))
  )${titleLine ? `\n\np <- p + ${titleLine}` : ''}

print(p)
`
}

function buildGgplot2Scale(data: ForestPlotData[], config: PlotConfig): string {
  // Calculate limits
  let limits: string | null = null
  if (config.xLimits !== 'auto') {
    limits = `c(${config.xLimits[0]}, ${config.xLimits[1]})`
  } else {
    // Auto limits with padding (÷1.3, ×1.3)
    const allValues = data.flatMap(d => [d.ci_lower, d.value, d.ci_upper])
    const minVal = Math.min(...allValues)
    const maxVal = Math.max(...allValues)
    const xMin = minVal / 1.3
    const xMax = maxVal * 1.3
    limits = `c(${xMin.toFixed(4)}, ${xMax.toFixed(4)})`
  }

  // Calculate breaks
  let breaks: string | null = null
  if (config.xBreaks !== 'auto' && Array.isArray(config.xBreaks) && config.xBreaks.length > 0) {
    breaks = `c(${config.xBreaks.join(', ')})`
  }

  // Build scale call with all parameters
  const params: string[] = []

  // Add transformation based on axis type
  switch (config.axisType) {
    case 'log2':
      params.push('trans = "log2"')
      break
    case 'loge':
      params.push('trans = "log"')
      break
    case 'log10':
      // For log10, we'll use scale_x_log10() which is more idiomatic
      break
    // linear has no trans parameter
  }

  // Add limits
  if (limits) {
    params.push(`limits = ${limits}`)
  }

  // Add breaks
  if (breaks) {
    params.push(`breaks = ${breaks}`)
  }

  // Generate the scale function call
  if (config.axisType === 'log10') {
    // Use scale_x_log10() for log10
    const nonTransParams = params.filter(p => !p.startsWith('trans'))
    if (nonTransParams.length > 0) {
      return `scale_x_log10(${nonTransParams.join(', ')}) +`
    } else {
      return 'scale_x_log10() +'
    }
  } else {
    // Use scale_x_continuous() for all others
    if (params.length > 0) {
      return `scale_x_continuous(${params.join(', ')}) +`
    } else {
      return 'scale_x_continuous() +'
    }
  }
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

export function validateData(data: ForestPlotData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.length === 0) {
    errors.push('No data provided')
    return { valid: false, errors }
  }

  data.forEach((row, idx) => {
    if (!row.outcome || row.outcome.trim() === '') {
      errors.push(`Row ${idx + 1}: Outcome name is required`)
    }
    if (isNaN(row.value)) {
      errors.push(`Row ${idx + 1}: Value must be a valid number`)
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
