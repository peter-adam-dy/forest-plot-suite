import type { PlotConfig, LayoutStyle } from '@/types'

export interface PlotDimensions {
  width: number
  height: number
}

/**
 * Calculate optimal plot dimensions based on study count and layout style
 * @param studyCount Number of studies in the dataset
 * @param config Plot configuration
 * @returns Dimensions in inches
 */
export function calculatePlotDimensions(
  studyCount: number,
  config: PlotConfig
): PlotDimensions {
  // If manual dimensions are set, use them
  if (config.width !== 'auto' && config.height !== 'auto') {
    return {
      width: config.width,
      height: config.height,
    }
  }

  // Calculate auto dimensions
  const width = config.width !== 'auto' ? config.width : getAutoWidth(config.layoutStyle)
  const height = config.height !== 'auto' ? config.height : getAutoHeight(studyCount, config.layoutStyle)

  return { width, height }
}

function getAutoWidth(layoutStyle: LayoutStyle): number {
  // Width is fairly consistent across layouts
  if (layoutStyle === 'modern') {
    return 10  // Modern layout: slightly more compact
  } else {
    return 12  // Classic layout: needs more space for columns
  }
}

function getAutoHeight(studyCount: number, layoutStyle: LayoutStyle): number {
  if (layoutStyle === 'modern') {
    // Modern (ggplot2): ~0.5 inches per study
    // Base: 2 inches for title, axis labels, margins
    // Per study: 0.5 inches (point + error bar + label space)
    const baseHeight = 2.5
    const heightPerStudy = 0.5
    const calculatedHeight = baseHeight + studyCount * heightPerStudy

    // Constrain between reasonable bounds
    return Math.max(4, Math.min(20, calculatedHeight))
  } else {
    // Classic (meta::forest): more compact due to table format
    // Base: 3 inches for title, column headers, summary stats
    // Per study: 0.35 inches (more compact table rows)
    const baseHeight = 3.5
    const heightPerStudy = 0.35
    const calculatedHeight = baseHeight + studyCount * heightPerStudy

    // Constrain between reasonable bounds
    return Math.max(6, Math.min(24, calculatedHeight))
  }
}

/**
 * Get pixel dimensions for PNG device
 * @param dimensions Dimensions in inches
 * @param dpi Dots per inch
 * @returns Pixel dimensions
 */
export function getPixelDimensions(
  dimensions: PlotDimensions,
  dpi: number
): { widthPixels: number; heightPixels: number } {
  return {
    widthPixels: Math.round(dimensions.width * dpi),
    heightPixels: Math.round(dimensions.height * dpi),
  }
}
