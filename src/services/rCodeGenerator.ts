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
  const outcomes = data.map(d => {
    // Escape quotes and preserve newlines for multi-line labels
    const escaped = d.outcome.replace(/"/g, '\\"').replace(/\n/g, '\\n')
    return `"${escaped}"`
  }).join(', ')

  // Use NA for missing values (check for undefined, null, NaN, and empty string)
  const toRValue = (val: any): string => {
    // Check if value is missing, null, undefined, NaN, or empty string
    if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
      return 'NA'
    }
    // Return as string to ensure consistent type
    return String(val)
  }

  const values = data.map(d => toRValue(d.value)).join(', ')
  const ciLowers = data.map(d => toRValue(d.ci_lower)).join(', ')
  const ciUppers = data.map(d => toRValue(d.ci_upper)).join(', ')

  return `
dat <- data.frame(
  outcome = c(${outcomes}),
  value = c(${values}),
  ci_lower = c(${ciLowers}),
  ci_upper = c(${ciUppers}),
  stringsAsFactors = FALSE
)

# Set outcome levels to preserve order (all outcomes, including those without data)
dat$outcome <- factor(dat$outcome, levels = rev(dat$outcome))

# Create subset for plotting (only rows with complete data)
dat_plot <- dat[!is.na(dat$value) & !is.na(dat$ci_lower) & !is.na(dat$ci_upper), ]
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

  // Label code conditional on showValues (only for rows with data)
  const labelCode = config.showValues ? `
  dat_plot$label <- sprintf("%.2f\\n(%.2f–%.2f)", dat_plot$value, dat_plot$ci_lower, dat_plot$ci_upper)
` : ''

  const labelGeom = config.showValues ? `
  geom_text(data = dat_plot, aes(label = label), position = position_nudge(y = -0.12), vjust = 1, size = 3.3) +` : ''

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
# Use dat for y-axis to show all outcomes, but dat_plot for geoms to only plot complete data
p <- ggplot(dat, aes(x = value, y = outcome)) +
  ${refLine}geom_point(data = dat_plot, size = ${config.pointSize}, color = "${pointColor}") +
  geom_errorbar(data = dat_plot, aes(xmin = ci_lower, xmax = ci_upper), width = 0, linewidth = 0.7, color = "${pointColor}") +
  ${scaleCode}
  scale_y_discrete(drop = FALSE) +
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
    // Auto limits with padding (÷1.3, ×1.3) - only use rows with complete data
    const allValues = data
      .filter(d => d.value !== undefined && d.ci_lower !== undefined && d.ci_upper !== undefined)
      .flatMap(d => [d.ci_lower!, d.value!, d.ci_upper!])

    if (allValues.length > 0) {
      const minVal = Math.min(...allValues)
      const maxVal = Math.max(...allValues)
      const xMin = minVal / 1.3
      const xMax = maxVal * 1.3
      limits = `c(${xMin.toFixed(4)}, ${xMax.toFixed(4)})`
    } else {
      // If no data points, use default range
      limits = 'c(0, 1)'
    }
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

    // If any numeric value is provided, validate them
    const hasValue = row.value !== undefined && row.value !== null
    const hasLower = row.ci_lower !== undefined && row.ci_lower !== null
    const hasUpper = row.ci_upper !== undefined && row.ci_upper !== null

    if (hasValue && isNaN(row.value!)) {
      errors.push(`Row ${idx + 1}: Value must be a valid number`)
    }
    if (hasLower && isNaN(row.ci_lower!)) {
      errors.push(`Row ${idx + 1}: Lower CI must be a valid number`)
    }
    if (hasUpper && isNaN(row.ci_upper!)) {
      errors.push(`Row ${idx + 1}: Upper CI must be a valid number`)
    }

    // Only validate CI range if both are provided
    if (hasLower && hasUpper && row.ci_lower! > row.ci_upper!) {
      errors.push(`Row ${idx + 1}: Lower CI cannot be greater than Upper CI`)
    }
  })

  return { valid: errors.length === 0, errors }
}
