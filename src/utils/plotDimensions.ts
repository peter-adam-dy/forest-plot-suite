import type { PlotConfig } from '@/types'

export interface PlotDimensions {
  width: number
  height: number
}

/**
 * Calculate optimal plot dimensions based on study count
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
  const width = config.width !== 'auto' ? config.width : getAutoWidth()
  const height = config.height !== 'auto' ? config.height : getAutoHeight(studyCount)

  return { width, height }
}

function getAutoWidth(): number {
  return 10  // Standard width for ggplot2 layout
}

function getAutoHeight(studyCount: number): number {
  // ggplot2: ~0.5 inches per study
  // Base: 2.5 inches for title, axis labels, margins
  // Per study: 0.5 inches (point + error bar + label space)
  const baseHeight = 2.5
  const heightPerStudy = 0.5
  const calculatedHeight = baseHeight + studyCount * heightPerStudy

  // Constrain between reasonable bounds
  return Math.max(4, Math.min(20, calculatedHeight))
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
