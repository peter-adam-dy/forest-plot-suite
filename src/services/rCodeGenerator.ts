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
  const studies = data.map(d => `"${d.study.replace(/"/g, '\\"')}"`).join(', ')
  const values = data.map(d => d.value).join(', ')
  const ciLowers = data.map(d => d.ci_lower).join(', ')
  const ciUppers = data.map(d => d.ci_upper).join(', ')

  return `
dat <- data.frame(
  study = c(${studies}),
  value = c(${values}),
  ci_lower = c(${ciLowers}),
  ci_upper = c(${ciUppers}),
  stringsAsFactors = FALSE
)

# Reverse order for top-to-bottom display
dat$study <- factor(dat$study, levels = rev(dat$study))
`
}

function buildGgplot2PlotCode(data: ForestPlotData[], config: PlotConfig): string {
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
  dat$label <- sprintf("%.2f\\n(%.2f–%.2f)", dat$value, dat$ci_lower, dat$ci_upper)
` : ''

  const labelGeom = config.showValues ? `
  geom_text(aes(label = label), position = position_nudge(y = -0.25), vjust = 1, size = 3.3) +` : ''

  const pointColor = getGgplot2Color(config.colorScheme)
  const xlab = config.xLabel || 'Value'

  // Reference line (only if specified)
  const refLine = config.referenceLineValue !== null
    ? `geom_vline(xintercept = ${config.referenceLineValue}, linetype = "dashed", color = "grey50") +\n  `
    : ''

  return `
${labelCode}
p <- ggplot(dat, aes(x = value, y = study)) +
  ${refLine}geom_point(size = ${config.pointSize}, color = "${pointColor}") +
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
  const allValues = data.flatMap(d => [d.ci_lower, d.value, d.ci_upper])
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
