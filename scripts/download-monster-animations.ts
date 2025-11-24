import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://maplestory.io/api'

// 讀取現有的 monsters-gif 清單
const availableImagesPath = path.join(__dirname, '../data/available-images.json')
const availableImages = JSON.parse(fs.readFileSync(availableImagesPath, 'utf-8'))
const monsterIds: number[] = availableImages['monsters-gif'] || []

console.log(`Found ${monsterIds.length} monsters with GIF animations`)

// 下載設定
const animations = ['hit1', 'die1']
const outputDirs = {
  hit1: path.join(__dirname, '../public/images/monsters-hit'),
  die1: path.join(__dirname, '../public/images/monsters-die')
}

// 確保目錄存在
for (const dir of Object.values(outputDirs)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// 下載函數
async function downloadAnimation(mobId: number, animation: string): Promise<boolean> {
  // 嘗試不同的 API 版本和格式
  const attempts = [
    { version: 'gms/83', action: animation },
    { version: 'GMS/240', action: animation },
    { version: 'jms/419', action: animation }
  ]

  for (const { version, action } of attempts) {
    const url = `${BASE_URL}/${version}/mob/${mobId}/render/${action}`

    try {
      const response = await fetch(url)

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('image')) {
          const buffer = await response.arrayBuffer()
          const outputPath = path.join(outputDirs[animation as keyof typeof outputDirs], `${mobId}.gif`)
          fs.writeFileSync(outputPath, Buffer.from(buffer))
          return true
        }
      }
    } catch {
      // 繼續嘗試下一個版本
    }
  }

  return false
}

// 主函數
async function main() {
  const results = {
    hit1: { success: [] as number[], failed: [] as number[] },
    die1: { success: [] as number[], failed: [] as number[] }
  }

  const total = monsterIds.length * animations.length
  let completed = 0

  for (const animation of animations) {
    console.log(`\nDownloading ${animation} animations...`)

    for (const mobId of monsterIds) {
      const success = await downloadAnimation(mobId, animation)

      if (success) {
        results[animation as keyof typeof results].success.push(mobId)
      } else {
        results[animation as keyof typeof results].failed.push(mobId)
      }

      completed++
      if (completed % 20 === 0) {
        console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`)
      }

      // 避免請求過快
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // 輸出結果
  console.log('\n=== Download Results ===')
  for (const animation of animations) {
    const result = results[animation as keyof typeof results]
    console.log(`\n${animation}:`)
    console.log(`  Success: ${result.success.length}`)
    console.log(`  Failed: ${result.failed.length}`)

    if (result.failed.length > 0 && result.failed.length <= 20) {
      console.log(`  Failed IDs: ${result.failed.join(', ')}`)
    }
  }

  // 保存成功的 ID 清單
  const outputData = {
    'monsters-hit': results.hit1.success.sort((a, b) => a - b),
    'monsters-die': results.die1.success.sort((a, b) => a - b),
    'failed-hit': results.hit1.failed,
    'failed-die': results.die1.failed
  }

  const outputPath = path.join(__dirname, '../data/monsters-animations-result.json')
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))
  console.log(`\nResults saved to ${outputPath}`)
}

main().catch(console.error)
