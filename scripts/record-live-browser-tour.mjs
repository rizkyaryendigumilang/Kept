import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs/promises'

const BASE_URL = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5173'
const VIDEO_OUT_DIR = path.resolve('public/showcase/live-video')
const STILL_OUT_DIR = path.resolve('public/showcase/live')

async function launchVisibleBrowser(windowWidth = 1440, windowHeight = 900, posX = 60, posY = 30) {
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch({
        headless: false,
        ...(channel ? { channel } : {}),
        args: [
          `--app=${BASE_URL}/?demo=1&screen=unlock`,
          `--window-position=${posX},${posY}`,
          `--window-size=${windowWidth},${windowHeight}`,
          '--disable-infobars'
        ]
      })
    } catch {
      // try next channel
    }
  }
  throw new Error('Tidak dapat membuka Chrome/Edge untuk rekaman live.')
}

/**
 * Injects:
 * 1. Automatic IP / localhost / sensitive string redaction ("tutupin IP nya")
 * 2. Top-right Privacy Shield badge ("IP & DATA DISENSOR · kept.id")
 * 3. Smooth animated pointer + click ripple
 * 4. Smooth CSS camera zoom-in & zoom-out on #root
 * 5. Live Menu Explanation HUD banner
 */
async function injectLiveTourController(page, isMobile = false) {
  await page.evaluate((mobile) => {
    // 1. Privacy & IP Redaction Observer
    const redactTextNodes = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        if (!node.nodeValue) continue
        let v = node.nodeValue
        v = v.replace(/\b(?:127\.0\.0\.1|localhost)(?::\d+)?\b/gi, 'kept.id')
        v = v.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '•••.•••.•••.•••')
        if (v !== node.nodeValue) {
          node.nodeValue = v
        }
      }
    }
    redactTextNodes()
    if (!window.__keptRedactObs) {
      window.__keptRedactObs = new MutationObserver(() => redactTextNodes())
      window.__keptRedactObs.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      })
    }

    // 2. Setup smooth camera zoom transition on #root (clean, no circular touch indicator)
    const root = document.getElementById('root') || document.body
    root.style.transition =
      'transform 620ms cubic-bezier(0.22, 1, 0.36, 1), transform-origin 620ms cubic-bezier(0.22, 1, 0.36, 1)'
    root.style.willChange = 'transform'

    // 3. Create Live Menu Explanation HUD Banner
    if (!document.getElementById('kept-live-hud')) {
      const hud = document.createElement('div')
      hud.id = 'kept-live-hud'
      Object.assign(hud.style, {
        position: 'fixed',
        left: mobile ? '12px' : '28px',
        right: mobile ? '12px' : 'auto',
        bottom: mobile ? '76px' : '24px',
        maxWidth: mobile ? '366px' : '560px',
        backgroundColor: 'rgba(15, 17, 21, 0.94)',
        border: '1.5px solid #9ece6a',
        borderRadius: '12px',
        padding: mobile ? '10px 12px' : '12px 16px',
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.68)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#ffffff',
        zIndex: '2147483646',
        pointerEvents: 'none',
        opacity: '0',
        transform: 'translateY(10px)',
        transition: 'opacity 240ms ease, transform 240ms ease'
      })
      document.body.appendChild(hud)
    }

    window.__keptTour = {
      moveCursor() {},
      hideCursor() {},
      pulseClick() {},
      zoom(scale = 1, originXPercent = 50, originYPercent = 50) {
        const r = document.getElementById('root') || document.body
        const clampedX = Math.max(25, Math.min(75, originXPercent))
        const clampedY = Math.max(25, Math.min(75, originYPercent))
        r.style.transformOrigin = `${clampedX}% ${clampedY}%`
        r.style.transform = scale === 1 ? 'scale(1)' : `scale(${scale})`
      },
      showHud(tag, title, desc) {
        const hud = document.getElementById('kept-live-hud')
        if (!hud) return
        if (!tag && !title) {
          hud.style.opacity = '0'
          hud.style.transform = 'translateY(10px)'
          return
        }
        hud.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
            <span style="font-family:monospace;font-size:10.5px;font-weight:700;color:#0f1115;background:#9ece6a;padding:2px 7px;border-radius:4px;">${tag}</span>
            <span style="font-family:monospace;font-size:10px;color:#9ece6a;">IP & PRIVASI DISENSOR</span>
          </div>
          <div style="font-size:${mobile ? '13.5px' : '15px'};font-weight:700;color:#ffffff;margin-bottom:3px;">${title}</div>
          <div style="font-size:${mobile ? '11.5px' : '12.5px'};line-height:1.38;color:#c0c4cc;">${desc}</div>
        `
        hud.style.opacity = '1'
        hud.style.transform = 'translateY(0)'
      }
    }
  }, isMobile)
}

async function setStateAndCaptureStill(page, query, stillFilename, isMobile = false, extraAction = null) {
  await page.evaluate((q) => {
    const r = document.getElementById('root') || document.body
    r.style.transition = 'none'
    r.style.transformOrigin = '50% 50%'
    r.style.transform = 'scale(1)'
    window.__keptTour?.hideCursor()
    window.__keptTour?.showHud('', '', '')
    if (window.__setDemoState) {
      window.__setDemoState(q)
    }
  }, query)

  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 })
  } catch {
    // ignore timeout
  }
  await page.waitForTimeout(750)

  if (extraAction === 'pin-dots') {
    const btns = page.locator('.pin-key-btn')
    if ((await btns.count()) >= 4) {
      await btns.nth(0).click()
      await btns.nth(2).click()
      await btns.nth(4).click()
      await btns.nth(7).click()
      await page.waitForTimeout(240)
    }
  } else if (extraAction === 'click-doc-qr') {
    const qrBtn = page.locator('button[aria-label="QR Code"]').first()
    if (await qrBtn.count()) {
      await qrBtn.click()
      await page.waitForTimeout(450)
    }
  }

  if (stillFilename) {
    await page.screenshot({ path: path.join(STILL_OUT_DIR, stillFilename), fullPage: false })
  }

  await page.evaluate(() => {
    const r = document.getElementById('root') || document.body
    r.style.transition =
      'transform 620ms cubic-bezier(0.22, 1, 0.36, 1), transform-origin 620ms cubic-bezier(0.22, 1, 0.36, 1)'
  })
}

async function tourStep(page, { zoom = 1.24, ox = 50, oy = 50, tag, title, desc, holdMs = 850 }) {
  const proportionalZoom = Math.min(1.26, Math.max(1.18, zoom))
  await page.evaluate(
    ({ t, ti, d, s, xPct, yPct }) => {
      window.__keptTour?.showHud(t, ti, d)
      window.__keptTour?.zoom(s, xPct, yPct)
    },
    { t: tag, ti: title, d: desc, s: proportionalZoom, xPct: ox, yPct: oy }
  )
  await page.waitForTimeout(holdMs + 250)
  await page.evaluate(() => window.__keptTour?.zoom(1, 50, 50))
  await page.waitForTimeout(480)
}

async function recordWebTour() {
  console.log('1. Membuka Web Browser Live di layar PC (1440x900) dan merekam semua tab...')
  const browser = await launchVisibleBrowser(1440, 900, 60, 30)
  const tmpVideoDir = path.join(VIDEO_OUT_DIR, 'tmp-web')
  await fs.rm(tmpVideoDir, { recursive: true, force: true })
  await fs.mkdir(tmpVideoDir, { recursive: true })

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      recordVideo: {
        dir: tmpVideoDir,
        size: { width: 1440, height: 900 }
      }
    })

    const page = await context.newPage()
    await page.goto(`${BASE_URL}/?demo=1&screen=unlock`, { waitUntil: 'networkidle' })
    await injectLiveTourController(page, false)

    // 1. Unlock Screen
    await setStateAndCaptureStill(page, 'screen=unlock&theme=dark', 'web-unlock.png', false, 'pin-dots')
    await tourStep(page, {
      x: 775,
      y: 590,
      zoom: 1.42,
      ox: 50,
      oy: 52,
      tag: 'LAYAR KUNCI · ZERO-KNOWLEDGE',
      title: 'Buka Brankas dengan PIN 6-8 Digit atau Face ID',
      desc: 'PIN diubah menjadi kunci 256-bit via Argon2id di perangkat Anda. Server tidak pernah tahu PIN Anda.',
      holdMs: 950
    })

    // 2. Tab 1 Beranda (Dark & Light)
    await setStateAndCaptureStill(page, 'route=home&theme=dark', 'web-home.png', false)
    await tourStep(page, {
      x: 540,
      y: 230,
      zoom: 1.38,
      ox: 48,
      oy: 28,
      tag: 'TAB 1 : BERANDA & PENGINGAT',
      title: 'Ringkasan Isi Brankas & Pengingat H-90, H-30, H-7',
      desc: 'Memantau total sandi, dokumen, dan kartu sekaligus memberi peringatan sebelum masa berlaku habis.',
      holdMs: 950
    })

    await setStateAndCaptureStill(page, 'route=home&theme=light', 'web-home-light.png', false)
    await tourStep(page, {
      x: 920,
      y: 180,
      zoom: 1.28,
      ox: 55,
      oy: 25,
      tag: 'PILIHAN TEMA',
      title: 'Tampilan Terang (Crisp Light) & Gelap (Omarchy Dark)',
      desc: 'Ganti suasana layar dengan kontras tinggi yang nyaman dipakai siang maupun malam.',
      holdMs: 750
    })

    // 3. Tab 2 Password & Detail HIBP
    await setStateAndCaptureStill(page, 'route=vault&theme=dark', 'web-vault.png', false)
    await tourStep(page, {
      x: 420,
      y: 260,
      zoom: 1.35,
      ox: 42,
      oy: 34,
      tag: 'TAB 2 : PASSWORD VAULT',
      title: 'Kelola Sandi Berdasarkan 5 Kategori Rapi',
      desc: 'Saring akun Favorit, Social, Web, Project, dan Catatan Rahasia dengan email yang disensor aman.',
      holdMs: 850
    })

    await setStateAndCaptureStill(page, 'route=vault&theme=dark&openItem=pass-github', 'web-vault-detail.png', false)
    await tourStep(page, {
      x: 960,
      y: 440,
      zoom: 1.42,
      ox: 68,
      oy: 48,
      tag: 'AUDIT KEBOCORAN SANDI',
      title: 'Cek Kebocoran HIBP (k-Anonymity) & Riwayat 5 Sandi',
      desc: 'Memeriksa keamanan sandi tanpa mengirim sandi asli keluar perangkat, dilengkapi auto-mask 8 detik.',
      holdMs: 950
    })

    // 4. Secret Share
    await setStateAndCaptureStill(page, 'route=vault&theme=dark&shareItem=pass-aws', 'web-share-secret.png', false)
    await tourStep(page, {
      x: 720,
      y: 460,
      zoom: 1.4,
      ox: 50,
      oy: 50,
      tag: 'FITUR SPESIAL : SECRET SHARE',
      title: 'Tautan Rahasia Sekali Buka (Hangus Otomatis)',
      desc: 'Atur batas lihat 1x, 3x, atau 5x dan masa aktif 1 jam s/d 7 hari. Bagikan aman ke WhatsApp.',
      holdMs: 950
    })

    // 5. Tab 3 Dokumen & QR Offline
    await setStateAndCaptureStill(page, 'route=documents&theme=dark', 'web-documents.png', false)
    await tourStep(page, {
      x: 480,
      y: 380,
      zoom: 1.36,
      ox: 44,
      oy: 44,
      tag: 'TAB 3 : DOKUMEN RESMI (GRID 3X2)',
      title: '20 Templat Dokumen Indonesia (KTP, Paspor, NPWP, SHM)',
      desc: 'Foto dokumen dikompresi otomatis <= 1600px dan dienkripsi AES-256-GCM dengan nomor tersensor.',
      holdMs: 950
    })

    await setStateAndCaptureStill(page, 'route=documents&theme=dark', 'web-documents-qr.png', false, 'click-doc-qr')
    await tourStep(page, {
      x: 720,
      y: 450,
      zoom: 1.4,
      ox: 50,
      oy: 48,
      tag: 'QR CODE OFFLINE',
      title: 'Tampilkan QR Code Nomor Dokumen Tanpa Internet',
      desc: 'Ubah nomor NIK, Paspor, atau NPWP menjadi kode QR vektor tajam kapan saja saat dibutuhkan.',
      holdMs: 850
    })

    // 6. Tab 4 Account / Kartu 3D & Barcode Kasir
    await setStateAndCaptureStill(page, 'route=banking&theme=dark', 'web-banking.png', false)
    await tourStep(page, {
      x: 720,
      y: 460,
      zoom: 1.42,
      ox: 50,
      oy: 50,
      tag: 'TAB 4 : DOMPET KARTU 3D & NFC',
      title: 'Tumpukan Kartu 3D Interaktif (6 Kategori Kartu)',
      desc: 'Simpan kartu bank, akses gedung NFC, member belanja, dan asuransi dengan nomor kartu tersensor.',
      holdMs: 950
    })

    await setStateAndCaptureStill(page, 'route=banking&theme=dark&barcodeCard=card-gym', 'web-banking-barcode.png', false)
    await tourStep(page, {
      x: 720,
      y: 450,
      zoom: 1.38,
      ox: 50,
      oy: 48,
      tag: 'MODE KASIR & PEMINDAI',
      title: 'Layar Barcode Code-128 & QR Kontras Tinggi',
      desc: 'Siap dipindai mesin scanner kasir atau input kartu baru lewat kamera HP dan sensor NFC.',
      holdMs: 850
    })

    // 7. Command Palette (Ctrl+K)
    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=command', 'web-command.png', false)
    await tourStep(page, {
      x: 720,
      y: 320,
      zoom: 1.38,
      ox: 50,
      oy: 38,
      tag: 'PINTASAN KILAT : CTRL+K',
      title: 'Command Palette: Cari & Salin dalam 1 Detik',
      desc: 'Cari sandi, nomor rekening, dan dokumen langsung di memori RAM dengan hapus clipboard otomatis.',
      holdMs: 850
    })

    // 8. Pusat Keamanan & Skor Kesehatan 0-100
    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=alerts', 'web-alerts.png', false)
    await tourStep(page, {
      x: 960,
      y: 320,
      zoom: 1.4,
      ox: 66,
      oy: 36,
      tag: 'PUSAT AUDIT KEAMANAN',
      title: 'Skor Kesehatan Sandi 0-100 & Deteksi Sandi Kembar',
      desc: 'Mengaudit sandi lemah atau berulang dan memindai kebocoran seluruh akun sekaligus.',
      holdMs: 900
    })

    // 9. Tab 5 Menu & Pengaturan + Submenu Keamanan (IP Disensor)
    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=menu', 'web-menu.png', false)
    await tourStep(page, {
      x: 960,
      y: 380,
      zoom: 1.36,
      ox: 66,
      oy: 42,
      tag: 'TAB 5 : MENU & 7 MODUL PENGATURAN',
      title: 'Pusat Kendali: Keamanan, Backup .kept, Tema, & Bahasa',
      desc: 'Jelajahi pengaturan PIN, biometrik, ekspor/impor terenkripsi, serta sinkronisasi offline IndexedDB.',
      holdMs: 900
    })

    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=menu&subpage=security', 'web-menu-security.png', false)
    await tourStep(page, {
      x: 960,
      y: 440,
      zoom: 1.4,
      ox: 66,
      oy: 48,
      tag: 'SESI LOGIN & RECOVERY KEY (IP DISENSOR)',
      title: 'Kendali Perangkat Aktif & Recovery Key 24 Karakter',
      desc: 'Semua alamat IP perangkat disensor (•••.•••.•••.•••). Cabut sesi asing atau simpan Recovery Key.',
      holdMs: 1000
    })

    const video = page.video()
    await context.close()
    const recordedPath = await video.path()
    const destPath = path.join(VIDEO_OUT_DIR, 'web-live-tour.webm')
    await fs.copyFile(recordedPath, destPath)
    await fs.rm(tmpVideoDir, { recursive: true, force: true })
    console.log('   Rekaman Web Browser selesai:', destPath)
  } finally {
    await browser.close()
  }
}

async function recordMobileTour() {
  console.log('2. Membuka Mobile iPhone Live di layar PC (390x844) dan merekam semua tab...')
  const browser = await launchVisibleBrowser(420, 880, 480, 40)
  const tmpVideoDir = path.join(VIDEO_OUT_DIR, 'tmp-mobile')
  await fs.rm(tmpVideoDir, { recursive: true, force: true })
  await fs.mkdir(tmpVideoDir, { recursive: true })

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      recordVideo: {
        dir: tmpVideoDir,
        size: { width: 390, height: 844 }
      }
    })

    const page = await context.newPage()
    await page.goto(`${BASE_URL}/?demo=1&screen=unlock`, { waitUntil: 'networkidle' })
    await injectLiveTourController(page, true)

    // 1. Mobile Unlock
    await setStateAndCaptureStill(page, 'screen=unlock&theme=dark', 'mobile-unlock.png', true, 'pin-dots')
    await tourStep(page, {
      x: 280,
      y: 640,
      zoom: 1.24,
      ox: 50,
      oy: 65,
      tag: 'IPHONE VIEW · PIN & FACE ID',
      title: 'Buka Cepat dengan Face ID atau PIN',
      desc: 'Enkripsi lokal Argon2id + AES-256-GCM di perangkat mobile.',
      holdMs: 750
    })

    // 2. Mobile Beranda
    await setStateAndCaptureStill(page, 'route=home&theme=dark', 'mobile-home.png', true)
    await tourStep(page, {
      x: 195,
      y: 280,
      zoom: 1.25,
      ox: 50,
      oy: 34,
      tag: 'TAB 1 : BERANDA MOBILE',
      title: 'Ringkasan & Pengingat H-90/H-30/H-7',
      desc: 'Pantau masa berlaku dokumen dan kartu langsung dari HP.',
      holdMs: 750
    })

    await setStateAndCaptureStill(page, 'route=home&theme=light', 'mobile-home-light.png', true)
    await tourStep(page, {
      zoom: 1.22,
      ox: 50,
      oy: 38,
      tag: 'PILIHAN TEMA MOBILE',
      title: 'Mode Terang (Crisp Light) & Gelap (Omarchy Dark)',
      desc: 'Kontras tajam yang nyaman dilihat di bawah sinar matahari maupun malam hari.',
      holdMs: 700
    })

    // 3. Mobile Password & Detail
    await setStateAndCaptureStill(page, 'route=vault&theme=dark', 'mobile-vault.png', true)
    await tourStep(page, {
      x: 195,
      y: 340,
      zoom: 1.22,
      ox: 50,
      oy: 40,
      tag: 'TAB 2 : PASSWORD MOBILE',
      title: 'Daftar Akun & Filter Kategori Cepat',
      desc: 'Ketuk salah satu akun untuk melihat detail dan status kebocoran sandi.',
      holdMs: 700
    })

    await setStateAndCaptureStill(page, 'route=vault&theme=dark&openItem=pass-github', 'mobile-vault-detail.png', true)
    await tourStep(page, {
      x: 195,
      y: 520,
      zoom: 1.28,
      ox: 50,
      oy: 62,
      tag: 'AUDIT HIBP & RIWAYAT',
      title: 'Cek Kebocoran Data k-Anonymity',
      desc: 'Status aman terverifikasi tanpa membocorkan sandi asli.',
      holdMs: 750
    })

    // 4. Mobile Secret Share
    await setStateAndCaptureStill(page, 'route=vault&theme=dark&shareItem=pass-aws', 'mobile-share-secret.png', true)
    await tourStep(page, {
      x: 195,
      y: 460,
      zoom: 1.24,
      ox: 50,
      oy: 55,
      tag: 'BAGI SANDI SEKALI BUKA',
      title: 'Kirim Tautan Rahasia ke WhatsApp',
      desc: 'Tautan otomatis hangus setelah dibuka penerima.',
      holdMs: 750
    })

    // 5. Mobile Dokumen & QR
    await setStateAndCaptureStill(page, 'route=documents&theme=dark', 'mobile-documents.png', true)
    await tourStep(page, {
      x: 195,
      y: 390,
      zoom: 1.24,
      ox: 50,
      oy: 46,
      tag: 'TAB 3 : DOKUMEN RESMI',
      title: '20 Templat Dokumen & Nomor Tersensor',
      desc: 'Simpan KTP-el, Paspor, NPWP, dan SIM dengan enkripsi penuh.',
      holdMs: 750
    })

    await setStateAndCaptureStill(page, 'route=documents&theme=dark', 'mobile-documents-qr.png', true, 'click-doc-qr')
    await tourStep(page, {
      x: 195,
      y: 420,
      zoom: 1.26,
      ox: 50,
      oy: 50,
      tag: 'QR CODE OFFLINE',
      title: 'Scan QR Dokumen Tanpa Sinyal',
      desc: 'Tampilkan QR NIK atau Paspor secara instan.',
      holdMs: 700
    })

    // 6. Mobile Kartu 3D & Barcode
    await setStateAndCaptureStill(page, 'route=banking&theme=dark', 'mobile-banking.png', true)
    await tourStep(page, {
      x: 195,
      y: 510,
      zoom: 1.26,
      ox: 50,
      oy: 60,
      tag: 'TAB 4 : KARTU 3D & NFC',
      title: 'Geser Tumpukan Kartu 3D di Layar HP',
      desc: 'Mendukung kamera scanner dan pembaca kartu fisik Web NFC.',
      holdMs: 750
    })

    await setStateAndCaptureStill(page, 'route=banking&theme=dark&barcodeCard=card-gym', 'mobile-banking-barcode.png', true)
    await tourStep(page, {
      x: 195,
      y: 440,
      zoom: 1.25,
      ox: 50,
      oy: 52,
      tag: 'BARCODE KASIR',
      title: 'Barcode Code-128 & QR Kontras Tinggi',
      desc: 'Mudah dipindai mesin scanner di kasir atau resepsionis.',
      holdMs: 700
    })

    // 7. Mobile Command & Alerts
    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=command', 'mobile-command.png', true)
    await tourStep(page, {
      zoom: 1.22,
      ox: 50,
      oy: 42,
      tag: 'PENCARIAN KILAT MOBILE',
      title: 'Command Palette: Cari Sandi, Kartu, & Dokumen',
      desc: 'Temukan dan salin data dalam 1 detik langsung di memori RAM perangkat.',
      holdMs: 750
    })

    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=alerts', 'mobile-alerts.png', true)
    await tourStep(page, {
      zoom: 1.24,
      ox: 50,
      oy: 46,
      tag: 'PUSAT KEAMANAN & SKOR 82/100',
      title: 'Skor Kesehatan Sandi & Riwayat Aktivitas',
      desc: 'Pantau kesehatan brankas dan perangkat aktif dengan sensor IP otomatis.',
      holdMs: 750
    })

    // 8. Mobile Menu & Security
    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=menu', 'mobile-menu.png', true)
    await tourStep(page, {
      zoom: 1.22,
      ox: 50,
      oy: 48,
      tag: 'TAB 5 : MENU PENGATURAN',
      title: '7 Modul Pengaturan, Backup .kept, & Tema',
      desc: 'Kelola preferensi tampilan, keamanan biometrik, dan cadangan terenkripsi.',
      holdMs: 750
    })

    await setStateAndCaptureStill(page, 'route=home&theme=dark&modal=menu&subpage=security', 'mobile-menu-security.png', true)
    await tourStep(page, {
      x: 195,
      y: 460,
      zoom: 1.26,
      ox: 50,
      oy: 54,
      tag: 'TAB 5 : MENU & KEAMANAN',
      title: 'Mode Offline, Sesi IP Disensor, & Recovery Key',
      desc: 'Tetap aktif saat sinyal mati dan dilengkapi kunci darurat 24 karakter.',
      holdMs: 800
    })

    const video = page.video()
    await context.close()
    const recordedPath = await video.path()
    const destPath = path.join(VIDEO_OUT_DIR, 'mobile-live-tour.webm')
    await fs.copyFile(recordedPath, destPath)
    await fs.rm(tmpVideoDir, { recursive: true, force: true })
    console.log('   Rekaman Mobile iPhone selesai:', destPath)
  } finally {
    await browser.close()
  }
}

async function main() {
  await fs.mkdir(VIDEO_OUT_DIR, { recursive: true })
  await fs.mkdir(STILL_OUT_DIR, { recursive: true })
  await recordWebTour()
  await recordMobileTour()
  console.log('Seluruh rekaman live browser (Web + Mobile) selesai!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
