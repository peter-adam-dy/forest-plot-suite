import { toRaw, isReactive, isRef } from 'vue'

/**
 * Recursively unwrap all Vue reactive objects to plain JavaScript objects
 */
export function deepToRaw<T>(obj: T): T {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj
  }

  // Unwrap refs
  if (isRef(obj)) {
    return deepToRaw(obj.value) as T
  }

  // Unwrap reactive objects
  const raw = isReactive(obj) ? toRaw(obj) : obj

  // Handle primitives
  if (typeof raw !== 'object') {
    return raw as T
  }

  // Handle arrays
  if (Array.isArray(raw)) {
    return raw.map(item => deepToRaw(item)) as T
  }

  // Handle dates
  if (raw instanceof Date) {
    return raw as T
  }

  // Handle plain objects
  const result: any = {}
  for (const key in raw) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      result[key] = deepToRaw((raw as any)[key])
    }
  }

  return result as T
}
