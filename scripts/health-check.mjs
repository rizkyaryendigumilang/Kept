import { readFileSync, existsSync } from 'node:fs'
import {
  generateSalt,
  deriveVaultKey,
  encryptJson,
  decryptJson,
  generateRecoveryKey,
  wrapMasterKeyWithRecovery,
  unwrapMasterKeyWithRecovery,
  keyFingerprint,
  encryptCustomBackup,
  decryptCustomBackup
} from '../src/lib/crypto.js'

// 1. Structural integrity check
for (const file of ['package.json', 'supabase/001_schema.sql', 'src/App.jsx', '.env.example', 'capacitor.config.json']) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`)
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
console.log(`[PASS] Structural integrity: ${pkg.name} v${pkg.version}`)

// 2. Cryptographic self-tests (Zero-Knowledge AES-256-GCM + Argon2id)
const testSalt = generateSalt()
const testMasterKey = deriveVaultKey('KeptTestMasterPassword!2026', testSalt)
if (!testMasterKey || testMasterKey.length !== 32) {
  throw new Error('Argon2id master key derivation failed')
}
console.log(`[PASS] Argon2id Key Derivation (32 bytes derived, fingerprint: ${keyFingerprint(testMasterKey)})`)

// 3. Vault item payload encrypt / decrypt roundtrip
const sampleVaultItem = {
  name: 'Verification Account',
  username: 'kept_user',
  password: 'SuperSecretPassword#123',
  category: 'social',
  notes: 'Automated CI test note'
}
const encryptedEnvelope = await encryptJson(sampleVaultItem, testMasterKey)
const decryptedPayload = await decryptJson(encryptedEnvelope, testMasterKey)
if (decryptedPayload.password !== sampleVaultItem.password || decryptedPayload.username !== sampleVaultItem.username) {
  throw new Error('Zero-knowledge payload encryption/decryption roundtrip mismatch')
}
console.log('[PASS] AES-GCM-256 Payload Roundtrip')

// 4. Recovery Key wrapping & unwrapping
const recoveryKey = generateRecoveryKey()
const wrappedRecoveryEnvelope = await wrapMasterKeyWithRecovery(testMasterKey, recoveryKey)
const unwrappedMasterKey = await unwrapMasterKeyWithRecovery(wrappedRecoveryEnvelope, recoveryKey)
if (keyFingerprint(testMasterKey) !== keyFingerprint(unwrappedMasterKey)) {
  throw new Error('Recovery key wrapping/unwrapping fingerprint mismatch')
}
console.log('[PASS] PBKDF2 + AES-GCM Recovery Key Wrap & Unwrap')

// 5. Custom backup format (.kept) encrypt / decrypt
const sampleBackupData = { items: [sampleVaultItem], exported_at: new Date().toISOString() }
const backupEnvelope = await encryptCustomBackup(sampleBackupData, 'BackupPassword#456')
const restoredBackup = await decryptCustomBackup(backupEnvelope, 'BackupPassword#456')
if (!restoredBackup.items || restoredBackup.items.length !== 1) {
  throw new Error('Custom backup encryption/decryption roundtrip mismatch')
}
console.log('[PASS] Kept Custom Encrypted Backup (.kept) Roundtrip')

console.log(`\nALL HEALTH & CRYPTOGRAPHIC VERIFICATION CHECKS PASSED: ${pkg.name} ${pkg.version}\n`)
