'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SearchInput, SuggestionList } from '@/components/search'
import { useSearchWithSuggestions } from '@/hooks/useSearchWithSuggestions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { matchesAllKeywords } from '@/lib/search-utils'
import type { SuggestionItem, SearchTypeFilter, MonsterIndexItem, ItemIndexItem } from '@/types'

// Same pattern as homepage: direct JSON imports for client-side search index
import monsterIndexRaw from '@/../chronostoryData/monster-index.json'
import itemIndexRaw from '@/../chronostoryData/item-index.json'

const monsterIndex = monsterIndexRaw as { totalMonsters: number; monsters: MonsterIndexItem[] }
const itemIndex = itemIndexRaw as { totalItems: number; items: ItemIndexItem[] }

/**
 * Detail page search bar — same approach as homepage SearchInput + SuggestionList.
 * Builds a name index from monster-index.json + item-index.json,
 * reuses the same UI components and keyboard navigation.
 */
export function SeoSearchBar() {
  const router = useRouter()
  const search = useSearchWithSuggestions()
  const [searchType, setSearchType] = useState<SearchTypeFilter>('all')
  const debouncedTerm = useDebouncedValue(search.searchTerm, 200)

  // Build name index from index files (same pattern as useSearchLogic)
  const nameIndex = useMemo(() => {
    const monsterMap = new Map<string, SuggestionItem>()
    const itemMap = new Map<string, SuggestionItem>()

    monsterIndex.monsters.forEach((m) => {
      const nameLower = m.mobName.toLowerCase()
      if (!monsterMap.has(nameLower)) {
        monsterMap.set(nameLower, {
          name: m.mobName,
          type: 'monster',
          count: m.dropCount,
          id: m.mobId,
          inGame: m.inGame,
        })
      }
      if (m.chineseMobName) {
        const cnLower = m.chineseMobName.toLowerCase()
        if (cnLower !== nameLower && !monsterMap.has(cnLower)) {
          monsterMap.set(cnLower, {
            name: m.chineseMobName,
            type: 'monster',
            count: m.dropCount,
            id: m.mobId,
            inGame: m.inGame,
          })
        }
      }
    })

    itemIndex.items.forEach((i) => {
      const nameLower = i.itemName.toLowerCase()
      if (!itemMap.has(nameLower)) {
        itemMap.set(nameLower, {
          name: i.itemName,
          type: 'item',
          count: i.monsterCount,
          id: i.itemId,
        })
      }
      if (i.chineseItemName) {
        const cnLower = i.chineseItemName.toLowerCase()
        if (cnLower !== nameLower && !itemMap.has(cnLower)) {
          itemMap.set(cnLower, {
            name: i.chineseItemName,
            type: 'item',
            count: i.monsterCount,
            id: i.itemId,
          })
        }
      }
    })

    return { monsterMap, itemMap }
  }, [])

  // Compute suggestions (same logic as useSearchLogic)
  const suggestions = useMemo(() => {
    if (debouncedTerm.trim() === '') return []

    const results: SuggestionItem[] = []
    const firstKeyword = debouncedTerm.toLowerCase().trim().split(/\s+/)[0]

    const searchInMap = (map: Map<string, SuggestionItem>) => {
      map.forEach((suggestion) => {
        if (matchesAllKeywords(suggestion.name, debouncedTerm)) {
          results.push(suggestion)
        }
      })
    }

    if (searchType === 'monster') {
      searchInMap(nameIndex.monsterMap)
    } else if (searchType === 'item') {
      searchInMap(nameIndex.itemMap)
    } else {
      searchInMap(nameIndex.monsterMap)
      searchInMap(nameIndex.itemMap)
    }

    results.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(firstKeyword)
      const bStarts = b.name.toLowerCase().startsWith(firstKeyword)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return b.count - a.count
    })

    return results.slice(0, 10)
  }, [debouncedTerm, nameIndex, searchType])

  // Navigate to detail page on suggestion select
  const handleSelectSuggestion = useCallback(
    (_name: string, suggestion?: SuggestionItem) => {
      if (!suggestion) return
      search.selectSuggestion(suggestion.name)

      if (suggestion.type === 'monster' && suggestion.id !== undefined) {
        router.push(`/monster/${suggestion.id}`)
      } else if (suggestion.type === 'item' && suggestion.id !== undefined) {
        router.push(`/item/${suggestion.id}`)
      }
    },
    [router, search]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      search.handleKeyDown(e, suggestions, (selected) => {
        if (selected.type === 'monster' && selected.id !== undefined) {
          router.push(`/monster/${selected.id}`)
        } else if (selected.type === 'item' && selected.id !== undefined) {
          router.push(`/item/${selected.id}`)
        }
      })
    },
    [search, suggestions, router]
  )

  return (
    <div className="relative flex-1 max-w-md mx-auto" ref={search.searchContainerRef}>
      <SearchInput
        value={search.searchTerm}
        onChange={(val) => {
          search.setSearchTerm(val)
          search.setShowSuggestions(true)
        }}
        onFocus={() => search.setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
      />
      <SuggestionList
        suggestions={suggestions}
        isVisible={search.showSuggestions}
        focusedIndex={search.focusedIndex}
        onSelect={handleSelectSuggestion}
        onFocusedIndexChange={search.setFocusedIndex}
      />
    </div>
  )
}
