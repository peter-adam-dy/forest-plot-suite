import type { ForestPlotData } from '@/types'
import * as XLSX from 'xlsx'

export interface ParsedData {
  data: ForestPlotData[]
  errors: string[]
  warnings: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate a single row of forest plot data
 */
export function validateRow(row: any, index: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  if (!row.outcome || String(row.outcome).trim() === '') {
    errors.push(`Row ${index + 1}: Outcome name is required`)
  }

  if (row.value === undefined || row.value === null || row.value === '') {
    errors.push(`Row ${index + 1}: Value is required`)
  } else if (isNaN(Number(row.value))) {
    errors.push(`Row ${index + 1}: Value must be a number`)
  }

  if (row.ci_lower === undefined || row.ci_lower === null || row.ci_lower === '') {
    errors.push(`Row ${index + 1}: Lower CI is required`)
  } else if (isNaN(Number(row.ci_lower))) {
    errors.push(`Row ${index + 1}: Lower CI must be a number`)
  }

  if (row.ci_upper === undefined || row.ci_upper === null || row.ci_upper === '') {
    errors.push(`Row ${index + 1}: Upper CI is required`)
  } else if (isNaN(Number(row.ci_upper))) {
    errors.push(`Row ${index + 1}: Upper CI must be a number`)
  }

  // Validate CI range
  if (!isNaN(Number(row.ci_lower)) && !isNaN(Number(row.ci_upper))) {
    if (Number(row.ci_lower) > Number(row.ci_upper)) {
      errors.push(`Row ${index + 1}: Lower CI cannot be greater than Upper CI`)
    }
  }

  // Validate weight if provided
  if (row.weight !== undefined && row.weight !== null && row.weight !== '') {
    if (isNaN(Number(row.weight))) {
      errors.push(`Row ${index + 1}: Weight must be a number`)
    } else if (Number(row.weight) < 0) {
      warnings.push(`Row ${index + 1}: Weight is negative`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Parse CSV text into forest plot data
 */
export function parseCSV(csvText: string): ParsedData {
  const errors: string[] = []
  const warnings: string[] = []
  const data: ForestPlotData[] = []

  try {
    // Split into lines
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      return { data: [], errors: ['CSV file is empty'], warnings: [] }
    }

    // Parse header
    const headerLine = lines[0]
    if (!headerLine) {
      return { data: [], errors: ['CSV header is missing'], warnings: [] }
    }
    const header = headerLine.split(',').map(h => h.trim().toLowerCase())

    // Find column indices
    const outcomeIdx = header.findIndex(h => h === 'outcome' || h === 'study')
    const valueIdx = header.findIndex(h => h === 'value' || h === 'effect')
    const ciLowerIdx = header.findIndex(h => h === 'ci_lower' || h === 'lower' || h === 'cilower')
    const ciUpperIdx = header.findIndex(h => h === 'ci_upper' || h === 'upper' || h === 'ciupper')
    const weightIdx = header.findIndex(h => h === 'weight')

    if (outcomeIdx === -1) errors.push('Missing "outcome" or "study" column')
    if (valueIdx === -1) errors.push('Missing "value" or "effect" column')
    if (ciLowerIdx === -1) errors.push('Missing "ci_lower" or "lower" column')
    if (ciUpperIdx === -1) errors.push('Missing "ci_upper" or "upper" column')

    if (errors.length > 0) {
      return { data: [], errors, warnings }
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const values = line.split(',').map(v => v.trim())

      const row = {
        outcome: values[outcomeIdx],
        value: values[valueIdx],
        ci_lower: values[ciLowerIdx],
        ci_upper: values[ciUpperIdx],
        weight: weightIdx !== -1 ? values[weightIdx] : undefined,
      }

      const validation = validateRow(row, i - 1)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)

      if (validation.isValid) {
        data.push({
          outcome: String(row.outcome),
          value: Number(row.value),
          ci_lower: Number(row.ci_lower),
          ci_upper: Number(row.ci_upper),
          weight: row.weight ? Number(row.weight) : undefined,
        })
      }
    }
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error}`)
  }

  return { data, errors, warnings }
}

/**
 * Parse Excel file into forest plot data
 */
export function parseExcel(
  file: ArrayBuffer,
  options: {
    sheetName?: string
    startRow?: number
    endRow?: number
    hasHeader?: boolean
  } = {}
): ParsedData {
  const errors: string[] = []
  const warnings: string[] = []
  const data: ForestPlotData[] = []

  try {
    const workbook = XLSX.read(file, { type: 'array' })

    // Get sheet
    const sheetName = options.sheetName || workbook.SheetNames[0] || ''
    if (!sheetName) {
      return { data: [], errors: ['No sheets found in Excel file'], warnings: [] }
    }
    const sheet = workbook.Sheets[sheetName]

    if (!sheet) {
      return { data: [], errors: [`Sheet "${sheetName}" not found`], warnings: [] }
    }

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: options.hasHeader !== false ? undefined : 1,
      range: options.startRow !== undefined ? options.startRow : undefined,
      blankrows: false,
    })

    if (jsonData.length === 0) {
      return { data: [], errors: ['Excel sheet is empty'], warnings: [] }
    }

    // Normalize headers
    const normalizeKey = (key: string): string => {
      return String(key).toLowerCase().trim().replace(/\s+/g, '_')
    }

    // Parse each row
    for (let i = 0; i < jsonData.length; i++) {
      if (options.endRow !== undefined && i >= options.endRow) break

      const rawRow = jsonData[i] as any
      const normalizedRow: any = {}

      for (const key in rawRow) {
        normalizedRow[normalizeKey(key)] = rawRow[key]
      }

      // Map columns
      const row = {
        outcome: normalizedRow.outcome || normalizedRow.study || normalizedRow['study_name'] || normalizedRow.name,
        value: normalizedRow.value || normalizedRow.effect || normalizedRow.effect_size || normalizedRow.es,
        ci_lower: normalizedRow.ci_lower || normalizedRow.lower || normalizedRow.cilower || normalizedRow.lower_ci,
        ci_upper: normalizedRow.ci_upper || normalizedRow.upper || normalizedRow.ciupper || normalizedRow.upper_ci,
        weight: normalizedRow.weight || normalizedRow.w,
      }

      const validation = validateRow(row, i)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)

      if (validation.isValid) {
        data.push({
          outcome: String(row.outcome),
          value: Number(row.value),
          ci_lower: Number(row.ci_lower),
          ci_upper: Number(row.ci_upper),
          weight: row.weight !== undefined ? Number(row.weight) : undefined,
        })
      }
    }
  } catch (error) {
    errors.push(`Failed to parse Excel: ${error}`)
  }

  return { data, errors, warnings }
}

/**
 * Get list of sheet names from Excel file
 */
export function getExcelSheets(file: ArrayBuffer): string[] {
  try {
    const workbook = XLSX.read(file, { type: 'array' })
    return workbook.SheetNames
  } catch (error) {
    console.error('Failed to read Excel file:', error)
    return []
  }
}

/**
 * Validate complete dataset
 */
export function validateData(data: ForestPlotData[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (data.length === 0) {
    errors.push('Dataset is empty')
    return { isValid: false, errors, warnings }
  }

  data.forEach((row, index) => {
    const validation = validateRow(row, index)
    errors.push(...validation.errors)
    warnings.push(...validation.warnings)
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
