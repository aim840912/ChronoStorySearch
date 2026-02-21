const fs = require('fs')
const path = require('path')
const https = require('https')

// Aqua Road 27 mobs (added in commit cd605534)
const aquaRoadMobIds = [
  2230105, 2230106, 2230107, 2230108, 2230109, 2230200,
  3000006, 3210450, 3230104, 3230405,
  4220000, 4220001, 4230123, 4230124, 4230200, 4230201,
  7130020,
  8140555, 8140600, 8141300, 8142100,
  8150100, 8150101,
  8510000, 8510100, 8520000,
  9300437
]

const tmpDir = process.env.TMPDIR || '/private/tmp/claude-501/'
const outputDir = path.join(tmpDir, 'aquaroad-monsters')

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`Created directory: ${outputDir}`)
}

// Download single image from maplestory.io (follows redirects)
function downloadImage(mobId) {
  return new Promise((resolve) => {
    const url = `https://maplestory.io/api/GMS/83/mob/${mobId}/icon`
    const outputPath = path.join(outputDir, `${mobId}.png`)

    // Skip if already downloaded
    if (fs.existsSync(outputPath)) {
      console.log(`SKIP ${mobId} (already exists)`)
      resolve({ mobId, status: 'skipped' })
      return
    }

    function fetchUrl(targetUrl, redirectCount) {
      if (redirectCount > 3) {
        console.log(`FAIL ${mobId} (too many redirects)`)
        resolve({ mobId, status: 'failed', error: 'too many redirects' })
        return
      }

      https
        .get(targetUrl, (response) => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            response.resume() // consume response body
            fetchUrl(response.headers.location, redirectCount + 1)
            return
          }

          if (response.statusCode === 200) {
            const fileStream = fs.createWriteStream(outputPath)
            response.pipe(fileStream)

            fileStream.on('finish', () => {
              fileStream.close()
              const size = fs.statSync(outputPath).size
              console.log(`OK   ${mobId}.png (${(size / 1024).toFixed(1)} KB)`)
              resolve({ mobId, status: 'success' })
            })
          } else if (response.statusCode === 404) {
            response.resume()
            console.log(`404  ${mobId}`)
            resolve({ mobId, status: '404' })
          } else {
            response.resume()
            console.log(`ERR  ${mobId} (HTTP ${response.statusCode})`)
            resolve({ mobId, status: 'error', code: response.statusCode })
          }
        })
        .on('error', (error) => {
          console.log(`FAIL ${mobId} - ${error.message}`)
          resolve({ mobId, status: 'failed', error: error.message })
        })
    }

    fetchUrl(url, 0)
  })
}

// Batch download with conservative concurrency
async function downloadAll() {
  console.log('Download Aqua Road monster icons from maplestory.io')
  console.log(`Total: ${aquaRoadMobIds.length} mobs`)
  console.log(`Output: ${outputDir}`)
  console.log('-'.repeat(50))

  const results = {
    success: [],
    skipped: [],
    notFound: [],
    failed: [],
  }

  const batchSize = 3
  for (let i = 0; i < aquaRoadMobIds.length; i += batchSize) {
    const batch = aquaRoadMobIds.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(downloadImage))

    batchResults.forEach((result) => {
      if (result.status === 'success') results.success.push(result.mobId)
      else if (result.status === 'skipped') results.skipped.push(result.mobId)
      else if (result.status === '404') results.notFound.push(result.mobId)
      else results.failed.push(result.mobId)
    })

    // Delay between batches to avoid rate limiting
    if (i + batchSize < aquaRoadMobIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

// Execute
downloadAll().then((results) => {
  console.log('\n' + '='.repeat(50))
  console.log('Download Summary')
  console.log('='.repeat(50))
  console.log(`Success:  ${results.success.length}`)
  console.log(`Skipped:  ${results.skipped.length}`)
  console.log(`404:      ${results.notFound.length}`)
  console.log(`Failed:   ${results.failed.length}`)
  console.log('='.repeat(50))

  if (results.notFound.length > 0) {
    console.log(`\nMissing mob IDs: ${results.notFound.join(', ')}`)
  }
  if (results.failed.length > 0) {
    console.log(`\nFailed mob IDs: ${results.failed.join(', ')}`)
  }

  console.log(`\nFiles saved to: ${outputDir}`)
})
