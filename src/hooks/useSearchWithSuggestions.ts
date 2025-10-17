import { useState, useRef, useCallback, useEffect } from 'react'
import type { SuggestionItem } from '@/types'

export function useSearchWithSuggestions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // 選擇建議項目
  const selectSuggestion = useCallback((suggestionName: string) => {
    setSearchTerm(suggestionName)
    setShowSuggestions(false)
    setFocusedIndex(-1)
  }, [])

  // 鍵盤導航處理
  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      suggestions: SuggestionItem[],
      onSelectCallback?: (suggestion: SuggestionItem) => void
    ) => {
      if (!showSuggestions || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
            const selectedSuggestion = suggestions[focusedIndex]
            selectSuggestion(selectedSuggestion.name)
            if (onSelectCallback) {
              onSelectCallback(selectedSuggestion)
            }
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          setFocusedIndex(-1)
          break
      }
    },
    [showSuggestions, focusedIndex, selectSuggestion]
  )

  // 點擊外部關閉建議列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    showSuggestions,
    setShowSuggestions,
    focusedIndex,
    setFocusedIndex,
    searchContainerRef,
    selectSuggestion,
    handleKeyDown,
  }
}
