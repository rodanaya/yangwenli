import { useState, useEffect, useTransition, useCallback } from 'react'

interface UseDebouncedSearchOptions {
  delay?: number
  minLength?: number
}

interface UseDebouncedSearchReturn {
  inputValue: string
  setInputValue: (value: string) => void
  debouncedValue: string
  isPending: boolean
  clear: () => void
}

/**
 * Hook for debounced search with React 18+ useTransition for non-blocking updates.
 *
 * Features:
 * - Debounces input changes to reduce API calls
 * - Uses useTransition to keep UI responsive during state updates
 * - Provides isPending state for visual feedback
 * - Optional minimum length before triggering search
 *
 * @example
 * ```tsx
 * const { inputValue, setInputValue, debouncedValue, isPending } = useDebouncedSearch('', { delay: 300 });
 *
 * // Use inputValue for the input field (immediate feedback)
 * // Use debouncedValue for API calls (debounced)
 *
 * useQuery({
 *   queryKey: ['search', debouncedValue],
 *   queryFn: () => searchApi(debouncedValue),
 *   enabled: debouncedValue.length >= 2,
 * });
 * ```
 */
export function useDebouncedSearch(
  initialValue: string = '',
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn {
  const { delay = 300, minLength = 0 } = options

  // Immediate input value (for responsive typing)
  const [inputValue, setInputValueInternal] = useState(initialValue)

  // Debounced value (for API calls)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  // React 18 transition for non-blocking updates
  const [isPending, startTransition] = useTransition()

  // Debounce effect
  useEffect(() => {
    // Skip if input is too short
    if (inputValue.length > 0 && inputValue.length < minLength) {
      return
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedValue(inputValue)
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [inputValue, delay, minLength])

  // Setter that updates input immediately
  const setInputValue = useCallback((value: string) => {
    setInputValueInternal(value)
  }, [])

  // Clear both values
  const clear = useCallback(() => {
    setInputValueInternal('')
    setDebouncedValue('')
  }, [])

  return {
    inputValue,
    setInputValue,
    debouncedValue,
    isPending,
    clear,
  }
}

/**
 * Simpler debounced value hook for cases where you don't need useTransition
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default useDebouncedSearch
