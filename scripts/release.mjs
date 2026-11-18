import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')

// Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const currentVersion = pkg.version

// Determine bump type or target version from args
const arg = process.argv[2] || 'current'
let newVersion = currentVersion

if (arg === 'patch' || arg === 'minor' || arg === 'major') {
  const parts = currentVersion.split('.').map(Number)
  if (arg === 'major') {
    parts[0] += 1
    parts[1] = 0
    parts[2] = 0
  } else if (arg === 'minor') {
    parts[1] += 1
    parts[2] = 0
  } else {
    parts[2] += 1
  }
  newVersion = parts.join('.')
} else if (/^\d+\.\d+\.\d+$/.test(arg.replace(/^v/, ''))) {
  newVersion = arg.replace(/^v/, '')
} else if (arg === 'current') {
  newVersion = currentVersion
} else {
  console.error(`❌ Argumen tidak valid "${arg}". Gunakan 'current', 'patch', 'minor', 'major', atau nomor versi seperti '0.1.1'.`)
  process.exit(1)
}

const tag = `v${newVersion}`
console.log(`\n=======================================================`)
console.log(`🚀 MEMPERSIAPKAN RILIS OTOMATIS: ${currentVersion} -> ${newVersion} (${tag})`)
console.log(`=======================================================\n`)

// Step 1: Run 5-Level Verification Tests
console.log('🧪 Step 1: Menjalankan verifikasi 5-Level testing...')
try {
  execSync('npm test', { stdio: 'inherit', cwd: rootDir })
} catch (e) {
  console.error('❌ Gagal: Pengujian kesehatan gagal. Rilis dibatalkan demi keamanan.')
  process.exit(1)
}

// Step 2: Update package.json version if changed
if (newVersion !== currentVersion) {
  console.log(`\n📝 Step 2: Memperbarui versi package.json ke ${newVersion}...`)
  pkg.version = newVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  execSync('git add package.json', { stdio: 'inherit', cwd: rootDir })
  execSync(`git commit -m "chore(release): bump version to ${tag}"`, { stdio: 'inherit', cwd: rootDir })
} else {
  console.log(`\n📝 Step 2: Menggunakan versi saat ini (${tag})...`)
}

// Step 3: Git Tag
console.log(`\n🏷️  Step 3: Menandai git tag ${tag}...`)
try {
  execSync(`git tag -a ${tag} -m "Release ${tag}"`, { stdio: 'inherit', cwd: rootDir })
  console.log(`✓ Tag ${tag} berhasil dibuat.`)
} catch (e) {
  console.log(`ℹ️  Tag ${tag} sudah ada lokal, melanjutkan proses push...`)
}

// Step 4: Push to Remote
console.log(`\n☁️  Step 4: Mendorong commit & tag ke GitHub (${tag})...`)
try {
  execSync('git push origin main', { stdio: 'inherit', cwd: rootDir })
  execSync(`git push origin ${tag}`, { stdio: 'inherit', cwd: rootDir })
} catch (e) {
  console.error('❌ Gagal push ke GitHub:', e.message)
  process.exit(1)
}

console.log(`\n=======================================================`)
console.log(`🎉 SUKSES! Tag ${tag} telah terdorong ke GitHub.`)
console.log(`GitHub Actions sedang mem-build APK & IPA secara otomatis,`)
console.log(`menulis changelog perbaikan bug, dan menerbitkan rilis ke:`)
console.log(`https://github.com/rizkyaryendigumilang/Kept/releases`)
console.log(`=======================================================\n`)
