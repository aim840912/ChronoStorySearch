'use client'

import { useState } from 'react'
import type { MobInfo } from '@/types'
import { MonsterStatsCard } from '@/components/MonsterStatsCard'
import { AccuracyCalculatorModal } from '@/components/AccuracyCalculatorModal'

interface MonsterStatsWithCalculatorProps {
  mobInfo: MobInfo
  monsterId: number
}

/**
 * Client wrapper that connects MonsterStatsCard's evasion click
 * to the AccuracyCalculatorModal with the current monster pre-selected.
 */
export function MonsterStatsWithCalculator({ mobInfo, monsterId }: MonsterStatsWithCalculatorProps) {
  const [isCalcOpen, setIsCalcOpen] = useState(false)

  return (
    <>
      <MonsterStatsCard
        mobInfo={mobInfo}
        onAccuracyClick={() => setIsCalcOpen(true)}
      />
      <AccuracyCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        initialMonsterId={monsterId}
      />
    </>
  )
}
