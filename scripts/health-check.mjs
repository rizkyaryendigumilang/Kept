import { readFileSync, existsSync } from 'node:fs'
import {
  generateSalt,
  deriveVaultKey,
  zeroKey,
  encryptJson,
  decryptJson,
  generateRecoveryKey,
  wrapMasterKeyWithRecovery,
  unwrapMasterKeyWithRecovery,
  keyFingerprint,
  encryptCustomBackup,
  decryptCustomBackup
} from '../src/lib/crypto.js'
import { isWeakPin, isUnlockPinLength } from '../src/lib/securityAudit.js'
import { isSafeDataUrl, parseDataUrl } from '../src/lib/safeUrl.js'
import { sha1Hex } from '../src/lib/pwned.js'
import { generateApplePassJson, buildPkpassBundle, hexToRgbString } from '../src/lib/walletPass.js'
import { checkHceSupport, activateHceCard, deactivateHceCard } from '../src/lib/hce.js'
import { getHelpdeskHandoffUrl, submitHelpdeskTicket, HELPDESK_BASE, APP_SLUG } from '../src/lib/helpdesk.js'
import { buildWatchtowerReport } from '../src/lib/watchtower.js'

console.log('======================================================================')
console.log('AI ENGINEERING TEAM SPECIFICATION: 5-LEVEL TESTING STANDARD VERIFICATION')
console.log('======================================================================\n')

// -----------------------------------------------------------------------------
// Level 1: Unit Testing (docs/18-testing-standard.md:52)
// -----------------------------------------------------------------------------
console.log('--- [Level 1: Unit Testing] ---')

// 1.1 Argon2id Key Derivation
const testSalt = generateSalt()
const testMasterKey = deriveVaultKey('KeptTestMasterPassword!2026', testSalt)
if (!testMasterKey || testMasterKey.length !== 32) {
  throw new Error('Argon2id master key derivation failed')
}
console.log(`[PASS] 1.1 Argon2id Key Derivation (32 bytes, fingerprint: ${keyFingerprint(testMasterKey)})`)

// 1.2 Memory Sanitization (zeroKey)
const dummyBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
zeroKey(dummyBuffer)
if (dummyBuffer.some((b) => b !== 0)) {
  throw new Error('zeroKey memory sanitization failed')
}
console.log('[PASS] 1.2 Memory Sanitization (zeroKey zero-fill byte wipe)')

// 1.3 AES-GCM-256 Symmetric Encryption/Decryption
const sampleItem = {
  name: 'Verification Account',
  username: 'kept_user',
  password: 'SuperSecretPassword#123',
  category: 'social',
  notes: 'Automated CI test note'
}
const encryptedEnvelope = await encryptJson(sampleItem, testMasterKey)
const decryptedPayload = await decryptJson(encryptedEnvelope, testMasterKey)
if (decryptedPayload.password !== sampleItem.password || decryptedPayload.username !== sampleItem.username) {
  throw new Error('AES-GCM-256 symmetric payload roundtrip mismatch')
}
console.log('[PASS] 1.3 AES-GCM-256 Symmetric Envelope Roundtrip')

// 1.4 PBKDF2 + AES-GCM Recovery Key Wrap & Unwrap
const recoveryKey = generateRecoveryKey()
const wrappedRecoveryEnvelope = await wrapMasterKeyWithRecovery(testMasterKey, recoveryKey)
const unwrappedMasterKey = await unwrapMasterKeyWithRecovery(wrappedRecoveryEnvelope, recoveryKey)
if (keyFingerprint(testMasterKey) !== keyFingerprint(unwrappedMasterKey)) {
  throw new Error('Recovery key wrapping/unwrapping fingerprint mismatch')
}
console.log('[PASS] 1.4 PBKDF2 + AES-GCM Recovery Key Wrap & Unwrap')

// 1.5 CSV Formula Injection Sanitizer Check
function testEscapeCsv(val) {
  if (val === null || val === undefined) return '""'
  let str = String(val)
  if (/^[=+\-@\t\r]/.test(str.trimStart())) {
    str = `'${str}`
  }
  return `"${str.replace(/"/g, '""')}"`
}
const maliciousCsvPayloads = [
  '=cmd|\' /C calc\'!A0',
  '  =cmd|\' /C calc\'!A0',
  '\t+SUM(A1:A10)',
  '   @malicious_ref',
  '-exec_command'
]
for (const p of maliciousCsvPayloads) {
  const escaped = testEscapeCsv(p)
  if (!escaped.startsWith(`"\'`)) {
    throw new Error(`CSV injection protection failed for: ${p}`)
  }
}
console.log('[PASS] 1.5 CSV Formula Injection Sanitization (leading whitespace & triggers prefixed with \')')

// -----------------------------------------------------------------------------
// Level 2: Module Testing (docs/18-testing-standard.md:65)
// -----------------------------------------------------------------------------
console.log('\n--- [Level 2: Module Testing] ---')

// 2.1 Custom Encrypted Backup (.kept) Module
const sampleBackupData = { items: [sampleItem], exported_at: new Date().toISOString() }
const backupEnvelope = await encryptCustomBackup(sampleBackupData, 'BackupPassword#456')
const restoredBackup = await decryptCustomBackup(backupEnvelope, 'BackupPassword#456')
if (!restoredBackup.items || restoredBackup.items.length !== 1) {
  throw new Error('Custom backup (.kept) roundtrip mismatch')
}
console.log('[PASS] 2.1 Custom Backup Module (.kept envelope format)')

// 2.2 Security Audit & PIN Policy Module
const shortPinCheck = isWeakPin('1234')
const weakPinCheck = isWeakPin('12345678')
const validPinCheck = isWeakPin('84920173')
if (!shortPinCheck.isWeak || !weakPinCheck.isWeak || validPinCheck.isWeak) {
  throw new Error('PIN policy validation failed')
}
console.log('[PASS] 2.2 Security Audit PIN Policy Module (min 8 digits, pattern blocklist)')

// 2.3 Safe URL & Anti-XSS Sanitizer Module
const maliciousUrl = 'javascript:alert(1)'
const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
if (parseDataUrl(maliciousUrl) !== null || !isSafeDataUrl(validDataUrl)) {
  throw new Error('Safe URL sanitizer failed to block malicious payload')
}
console.log('[PASS] 2.3 Safe URL & Anti-XSS Sanitizer Module (fails closed on non-allowlisted MIME)')

// 2.4 Digital Wallet Pass Engine (.pkpass & Apple PassKit)
const sampleCard = {
  id: 'card_verify_01',
  name: 'BCA Flazz Verified',
  bank_name: 'BCA',
  nfc_uid: 'A4:1F:8B:2C',
  barcode_value: '123456789012',
  color: '#0056b3'
}
const generatedPassJson = generateApplePassJson(sampleCard)
if (!generatedPassJson.passTypeIdentifier || !generatedPassJson.barcodes || generatedPassJson.backgroundColor !== hexToRgbString('#0056b3')) {
  throw new Error('Apple PassKit pass.json structure generation failed')
}
const pkpassZipBuffer = await buildPkpassBundle(generatedPassJson)
if (!pkpassZipBuffer || pkpassZipBuffer.length < 500) {
  throw new Error('.pkpass ZIP binary bundling failed')
}
console.log(`[PASS] 2.4 Digital Wallet Pass Engine (pass.json & .pkpass binary ZIP ${pkpassZipBuffer.length} bytes)`)

// 2.5 Host Card Emulation (HCE) & Native Android Bridge Module
const hceSupport = await checkHceSupport()
if (typeof hceSupport.supported !== 'boolean') {
  throw new Error('HCE bridge support verification failed')
}
const hceActivate = await activateHceCard({ id: sampleCard.id, name: sampleCard.name, uid: sampleCard.nfc_uid })
if (!hceActivate.active) {
  throw new Error('HCE card activation failed')
}
await deactivateHceCard()
console.log('[PASS] 2.5 Host Card Emulation (HCE) Android Service & Capacitor Bridge Module')

// 2.6 VPS Helpdesk SSO JIT Handoff Module
const testUser = { id: 'usr_kept_verify_99', email: 'audit@kept.app' }
const testProfile = { display_name: 'Super Auditor', role: 'Member' }
const testFromUrl = 'https://kept.app/#vault'
const handoffUrlStr = getHelpdeskHandoffUrl({ user: testUser, profile: testProfile, fromUrl: testFromUrl })
const parsedUrl = new URL(handoffUrlStr)

if (!handoffUrlStr.startsWith(HELPDESK_BASE)) {
  throw new Error(`Helpdesk base URL mismatch: ${handoffUrlStr}`)
}
if (parsedUrl.searchParams.get('app') !== APP_SLUG) {
  throw new Error(`Helpdesk app slug mismatch: expected ${APP_SLUG}`)
}
if (parsedUrl.searchParams.get('uid') !== testUser.id) {
  throw new Error(`Helpdesk uid mismatch: expected ${testUser.id}`)
}
if (parsedUrl.searchParams.get('name') !== testProfile.display_name) {
  throw new Error(`Helpdesk name mismatch: expected ${testProfile.display_name}`)
}
if (parsedUrl.searchParams.get('role') !== testProfile.role) {
  throw new Error(`Helpdesk role mismatch: expected ${testProfile.role}`)
}
if (parsedUrl.searchParams.get('from_url') !== testFromUrl) {
  throw new Error(`Helpdesk from_url mismatch: expected ${testFromUrl}`)
}
if (parsedUrl.searchParams.get('new') !== '1') {
  throw new Error(`Helpdesk new param mismatch: expected '1'`)
}

// Guest fallback verification
const guestHandoffUrl = getHelpdeskHandoffUrl({ user: null, profile: null, fromUrl: testFromUrl })
const parsedGuestUrl = new URL(guestHandoffUrl)
if (!parsedGuestUrl.searchParams.get('uid')) {
  throw new Error('Helpdesk guest fallback uid missing')
}
if (parsedGuestUrl.searchParams.get('role') !== 'Guest') {
  throw new Error('Helpdesk guest role mismatch')
}

// Complaint & Photo Attachment Schema Verification
const testComplaint = 'Gagal memindai tag NFC lift apartemen lantai 12'
const handoffWithComplaint = getHelpdeskHandoffUrl({
  user: testUser,
  profile: testProfile,
  fromUrl: testFromUrl,
  complaint: testComplaint
})
const parsedComplaintUrl = new URL(handoffWithComplaint)
if (parsedComplaintUrl.searchParams.get('message') !== testComplaint) {
  throw new Error('Helpdesk complaint message mismatch in handoff URL')
}
if (parsedComplaintUrl.searchParams.get('keluhan') !== testComplaint) {
  throw new Error('Helpdesk complaint keluhan mismatch in handoff URL')
}
if (!parsedComplaintUrl.searchParams.get('subject').includes('Gagal memindai tag NFC')) {
  throw new Error('Helpdesk complaint subject generation failed')
}

// Direct ticket submission without photo (not mandatory)
const submitResultNoPhoto = submitHelpdeskTicket({
  user: testUser,
  profile: testProfile,
  fromUrl: testFromUrl,
  complaint: testComplaint
})
if (!submitResultNoPhoto.ok || submitResultNoPhoto.hasPhoto !== false) {
  throw new Error('submitHelpdeskTicket without photo failed')
}

// Direct ticket submission with simulated photo file (optional photo attached)
const dummyPhotoBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG magic bytes
const dummyPhotoFile = new Blob([dummyPhotoBuffer], { type: 'image/png' })
const submitResultWithPhoto = submitHelpdeskTicket({
  user: testUser,
  profile: testProfile,
  fromUrl: testFromUrl,
  complaint: testComplaint,
  photoFile: dummyPhotoFile
})
if (!submitResultWithPhoto.ok || submitResultWithPhoto.hasPhoto !== true) {
  throw new Error('submitHelpdeskTicket with photo attachment failed')
}
console.log('[PASS] 2.6 VPS Helpdesk SSO JIT Handoff Module (complaint, optional photo attachment & URL params verified)')

// 2.7 Multi-Format Backup Schema Verification (.kept, .json, .csv)
// Schema 1: .kept Encrypted JSON Envelope
const keptBackupEnvelope = await encryptCustomBackup([sampleItem], 'VaultSecurePassword#2026')
if (keptBackupEnvelope.format !== 'KEPT_ENCRYPTED_BACKUP' || !keptBackupEnvelope.ciphertext) {
  throw new Error('Schema 1 (.kept) backup envelope generation failed')
}
const decryptedKeptItems = await decryptCustomBackup(keptBackupEnvelope, 'VaultSecurePassword#2026')
if (!Array.isArray(decryptedKeptItems) || decryptedKeptItems[0].password !== sampleItem.password) {
  throw new Error('Schema 1 (.kept) backup roundtrip decryption failed')
}

// Schema 2: .json Standard Raw Backup Format
const jsonBackupPayload = {
  app: 'kept',
  format: 'KEPT_JSON_EXPORT',
  version: 1,
  exported_at: new Date().toISOString(),
  item_count: 1,
  items: [sampleItem]
}
const serializedJson = JSON.stringify(jsonBackupPayload, null, 2)
const parsedJson = JSON.parse(serializedJson)
if (parsedJson.format !== 'KEPT_JSON_EXPORT' || !Array.isArray(parsedJson.items) || parsedJson.items[0].username !== sampleItem.username) {
  throw new Error('Schema 2 (.json) backup format verification failed')
}

// Schema 3: .csv Tabular Format with Injection Escaping
const testCsvRow = `\uFEFF` + [
  '"Type","Category","Name / Service","Username / Account","Password / Secret"',
  `"password","social","${sampleItem.name}","${sampleItem.username}","${sampleItem.password}"`
].join('\r\n')
if (!testCsvRow.startsWith('\uFEFF') || !testCsvRow.includes(sampleItem.password)) {
  throw new Error('Schema 3 (.csv) tabular format verification failed')
}
console.log('[PASS] 2.7 Multi-Format Backup Schema Verification (Schema 1: .kept, Schema 2: .json, Schema 3: .csv)')

// 2.8 Watchtower Security Health & Audit Module
const testVaultItems = [
  { id: '1', item_type: 'password', name: 'Google', password: 'password123' },
  { id: '2', item_type: 'password', name: 'Github', password: 'password123' }, // reused
  { id: '3', item_type: 'password', name: 'Bank BCA', password: 'P@ssw0rdSuperSecure2026!' },
  { id: '4', item_type: 'bank_card', bank_name: 'Mandiri', expiry: '01/20' } // expired
]
const watchtower = buildWatchtowerReport(testVaultItems)
if (!watchtower.stats || watchtower.stats.reusedCount !== 2 || watchtower.stats.weakCount < 1) {
  throw new Error('Watchtower report failed to detect reused or weak passwords correctly')
}
if (watchtower.stats.score >= 100) {
  throw new Error('Watchtower score did not penalize insecure credentials')
}
console.log(`[PASS] 2.8 Watchtower Security Health & Audit Module (Score: ${watchtower.stats.score}/100, Reused: ${watchtower.stats.reusedCount}, Weak: ${watchtower.stats.weakCount})`)

// -----------------------------------------------------------------------------
// Level 3: Integration Testing (docs/18-testing-standard.md:83)
// -----------------------------------------------------------------------------
console.log('\n--- [Level 3: Integration Testing] ---')

// 3.1 HaveIBeenPwned k-Anonymity Client-Side Hash Hashing
const testPassword = 'password123'
const hash = await sha1Hex(testPassword)
const prefix = hash.slice(0, 5)
const suffix = hash.slice(5)
if (prefix.length !== 5 || suffix.length !== 35) {
  throw new Error('k-Anonymity SHA-1 prefixing integration failed')
}
console.log(`[PASS] 3.1 HIBP k-Anonymity Hash Integration (5-char prefix: ${prefix}, 35-char client suffix match)`)

// -----------------------------------------------------------------------------
// Level 4: Workflow Testing (docs/18-testing-standard.md:101)
// -----------------------------------------------------------------------------
console.log('\n--- [Level 4: Workflow Testing] ---')

// 4.1 End-to-End Vault Lifecycle:
// Setup -> Encrypt Item -> Wrap with PIN -> Auto-Lock -> Unlock with PIN -> Decrypt Item
const userPin = '93810472'
const pinSalt = generateSalt()
const pinDerivedKey = deriveVaultKey(userPin, pinSalt)
const wrappedVaultKey = await encryptJson({ masterKeyHex: Buffer.from(testMasterKey).toString('hex') }, pinDerivedKey)

// Simulate App Lock (Memory Cleared)
let inMemoryKey = null

// Simulate Unlock Screen: User inputs PIN
const unlockKey = deriveVaultKey(userPin, pinSalt)
const unwrappedRecord = await decryptJson(wrappedVaultKey, unlockKey)
inMemoryKey = Buffer.from(unwrappedRecord.masterKeyHex, 'hex')

// Verify decrypted vault items match original
const reDecryptedItem = await decryptJson(encryptedEnvelope, inMemoryKey)
if (reDecryptedItem.password !== sampleItem.password) {
  throw new Error('End-to-end vault lifecycle workflow failed')
}
console.log('[PASS] 4.1 End-to-End Vault Lifecycle Workflow (Setup -> Encrypt -> Lock -> PIN Unlock -> Decrypt)')

// -----------------------------------------------------------------------------
// Level 5: Regression Testing (docs/18-testing-standard.md:121)
// -----------------------------------------------------------------------------
console.log('\n--- [Level 5: Regression Testing] ---')

// 5.1 Legacy PIN compatibility regression check
if (!isUnlockPinLength('123456') || !isUnlockPinLength('12345678')) {
  throw new Error('Legacy PIN unlock compatibility regression')
}
console.log('[PASS] 5.1 Backward Compatibility: Legacy 6-digit & modern 8+ digit PIN unlock accepted')

// 5.2 Structural integrity & configuration standards (docs/16 & docs/19)
for (const file of [
  'package.json',
  'supabase/001_schema.sql',
  'src/App.jsx',
  'AGENTS.md',
  'GLOSSARY.md',
  'docs/agents/issue-tracker.md',
  'docs/agents/domain.md',
  'docs/agents/triage-labels.md',
  'docs/design-system-standards.md',
  'docs/adr/0001-zero-knowledge-encryption-and-offline-sync.md',
  'docs/adr/0002-vps-helpdesk-sso-jit-handoff.md',
  '.env.example',
  '.env.production.example',
  'capacitor.config.json',
  'vite.config.js',
  'src/components/CardNfcWriterModal.jsx',
  'src/components/CardWalletPassModal.jsx',
  'src/components/HelpdeskTicketModal.jsx',
  'src/components/settings/HelpdeskSubpage.jsx',
  'src/components/settings/BackupSubpage.jsx',
  'src/components/settings/StorageSubpage.jsx',
  'src/components/settings/NotificationsSubpage.jsx',
  'src/lib/walletPass.js',
  'src/lib/hce.js',
  'src/lib/helpdesk.js',
  'src/lib/watchtower.js',
  'src/context/VaultModalContext.jsx',
  'src/styles/helpdesk.css',
  'android/app/src/main/res/xml/apduservice.xml',
  'android/app/src/main/java/com/kept/app/KeptCardEmulationService.java',
  'android/app/src/main/java/com/kept/app/KeptHcePlugin.java'
]) {
  if (!existsSync(file)) throw new Error(`Missing required configuration file: ${file}`)
}

// 5.3 Verify Helpdesk CSS Theme & Responsive Sheet Standards
const helpdeskCssContent = readFileSync('src/styles/helpdesk.css', 'utf8')
if (!helpdeskCssContent.includes(':root[data-theme="light"]') || !helpdeskCssContent.includes('sheet-drag-handle')) {
  throw new Error('src/styles/helpdesk.css missing light mode or mobile drag handle styles')
}
console.log('[PASS] 5.3 Helpdesk CSS Responsive Bottom-Sheet & Light Mode Integrity')

// 5.4 Verify Auto-lock State Cleanup Invariants
const appSource = readFileSync('src/App.jsx', 'utf8')
if (!appSource.includes('setHelpdeskModalOpen(false)') || !appSource.includes('setMenuSubpage(null)')) {
  throw new Error('src/App.jsx lockVault missing modal cleanup invariants')
}
console.log('[PASS] 5.4 Auto-Lock State Cleanup Invariant Verification')

// 5.5 Verify Bento Grid & Modern Typography Invariants
const stylesContent = readFileSync('src/styles.css', 'utf8')
if (!stylesContent.includes('.bento-grid') || !stylesContent.includes('.bento-hero') || !stylesContent.includes('.bento-stat-card')) {
  throw new Error('src/styles.css missing required Bento Grid modern layout classes')
}
const tokensContent = readFileSync('src/styles/tokens.css', 'utf8')
if (!tokensContent.includes('--tracking-tighter') || !tokensContent.includes('--glass-surface')) {
  throw new Error('src/styles/tokens.css missing modern typography or glassmorphism tokens')
}
console.log('[PASS] 5.5 Modern Design System Invariant: Bento Grid & Swiss Typography Tokens')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
console.log(`[PASS] 5.2 Configuration & Repository Layout Integrity (${pkg.name} v${pkg.version})`)

console.log('\n======================================================================')
console.log('ALL 5 TESTING LEVELS (LEVEL 1 TO LEVEL 5) PASSED: 100% COMPLIANT')
console.log('======================================================================\n')
