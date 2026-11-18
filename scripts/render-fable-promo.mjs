import path from 'node:path'
import fs from 'node:fs/promises'
import { bundle } from '@remotion/bundler'
import { getCompositions, renderStill, renderMedia } from '@remotion/renderer'

const OUT_BASE = path.resolve('public/showcase')
const FABLE_STILL_DIR = path.join(OUT_BASE, 'fable')
const VIDEO_DIR = path.join(OUT_BASE, 'videos')

async function main() {
  await fs.mkdir(FABLE_STILL_DIR, { recursive: true })
  await fs.mkdir(VIDEO_DIR, { recursive: true })

  console.log('1. Bundling Remotion Studio entry for Fable Reference Promo...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve('src/remotion/index.js'),
    publicDir: path.resolve('public')
  })
  console.log('   Bundle ready at:', bundleLocation)

  const compositions = await getCompositions(bundleLocation)
  const fableComp4x5 = compositions.find((c) => c.id === 'KeptFablePromoFeed4x5')

  if (!fableComp4x5) {
    throw new Error('Composition KeptFablePromoFeed4x5 not found!')
  }

  // 1. Render Sample Frames for Instant Visual Verification
  console.log('2. Rendering sample still frames for visual inspection...')
  const sampleFrames = [
    { frame: 60, name: '01-helix-argon2id.png' },
    { frame: 220, name: '02-helix-secret-share.png' },
    { frame: 420, name: '03-stack-deck.png' },
    { frame: 560, name: '04-stack-workspace-inspector.png' },
    { frame: 620, name: '05-stack-barcode-kasir.png' },
    { frame: 780, name: '06-grid-dokumen-filter.png' },
    { frame: 900, name: '07-grid-bento-finale.png' }
  ]

  for (const s of sampleFrames) {
    const outPath = path.join(FABLE_STILL_DIR, s.name)
    console.log(`   [Frame ${s.frame}] Rendering ${s.name}...`)
    await renderStill({
      composition: fableComp4x5,
      serveUrl: bundleLocation,
      output: outPath,
      imageFormat: 'png',
      frame: s.frame
    })
  }
  console.log('   All sample frames rendered to public/showcase/fable/')

  // 2. Render Main 4:5 Instagram Feed Video (matching the 720x900 reference video)
  console.log('3. Rendering KeptFablePromoFeed4x5 (1080x1350, 960 frames @ 30fps)...')
  const outVideo4x5 = path.join(VIDEO_DIR, 'kept-fable-promo-4x5.mp4')
  await renderMedia({
    composition: fableComp4x5,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outVideo4x5,
    concurrency: 4
  })
  console.log('   Successfully rendered:', outVideo4x5)

  // 3. Render 9:16 Instagram Reels Video
  const fableComp9x16 = compositions.find((c) => c.id === 'KeptFablePromoReels9x16')
  if (fableComp9x16) {
    console.log('4. Rendering KeptFablePromoReels9x16 (1080x1920, 960 frames @ 30fps)...')
    const outVideo9x16 = path.join(VIDEO_DIR, 'kept-fable-promo-reels-9x16.mp4')
    await renderMedia({
      composition: fableComp9x16,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outVideo9x16,
      concurrency: 4
    })
    console.log('   Successfully rendered:', outVideo9x16)
  }

  // 4. Render 16:9 Widescreen Video
  const fableComp16x9 = compositions.find((c) => c.id === 'KeptFablePromoWidescreen16x9')
  if (fableComp16x9) {
    console.log('5. Rendering KeptFablePromoWidescreen16x9 (1920x1080, 960 frames @ 30fps)...')
    const outVideo16x9 = path.join(VIDEO_DIR, 'kept-fable-promo-16x9.mp4')
    await renderMedia({
      composition: fableComp16x9,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outVideo16x9,
      concurrency: 4
    })
    console.log('   Successfully rendered:', outVideo16x9)
  }

  console.log('All Fable reference promo videos and stills rendered successfully!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
