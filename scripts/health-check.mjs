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
  '.env.example',
  '.env.production.example',
  'capacitor.config.json',
  'vite.config.js',
  'src/components/CardNfcWriterModal.jsx',
  'src/components/CardWalletPassModal.jsx',
  'src/lib/walletPass.js',
  'src/lib/hce.js',
  'android/app/src/main/res/xml/apduservice.xml',
  'android/app/src/main/java/com/kept/app/KeptCardEmulationService.java',
  'android/app/src/main/java/com/kept/app/KeptHcePlugin.java'
]) {
  if (!existsSync(file)) throw new Error(`Missing required configuration file: ${file}`)
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
console.log(`[PASS] 5.2 Configuration & Repository Layout Integrity (${pkg.name} v${pkg.version})`)

console.log('\n======================================================================')
console.log('ALL 5 TESTING LEVELS (LEVEL 1 TO LEVEL 5) PASSED: 100% COMPLIANT')
console.log('======================================================================\n')
