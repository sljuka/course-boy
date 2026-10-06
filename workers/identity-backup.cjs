// The publisher identity backup file (SLJ-42 / SLJ-53): `*.matko-identity`.
//
// The identity is the worker's Corestore primary key: every published
// course's code is derived from it, so losing it means never updating those
// courses again. The backup is a JSON file the teacher keeps anywhere (USB
// stick, cloud folder), protected by a password only they know:
//
//   in the clear  format, formatVersion, createdAt, publisherId (public key,
//                 shown when restoring), and the key-derivation parameters
//   encrypted     { primaryKey, courses: [{ id, title }] }
//
// Encryption: Argon2id (crypto_pwhash) turns the password and a random salt
// into a key; crypto_secretbox (XSalsa20-Poly1305) encrypts and authenticates
// the payload, so a wrong password or an edited file fails to open rather than
// yielding garbage. Pure functions, used by the worker and the unit tests;
// nothing here touches the disk.

const sodium = require('sodium-native')

const FORMAT = 'matko-identity'
const FORMAT_VERSION = 1
const KDF_ALGORITHM = 'argon2id13'
const CIPHER_ALGORITHM = 'xsalsa20poly1305'
const MIN_PASSWORD_LENGTH = 8

// Moderate: ~0.5–1 s and 256 MiB on a laptop, once per save or restore. A
// file asking for more than the caps (a crafted file) is refused, so opening
// one can't be made to exhaust the machine.
const DEFAULT_LIMITS = {
  memlimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
  opslimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
}
const MAX_MEMLIMIT = 1024 * 1024 * 1024
const MAX_OPSLIMIT = 16

class IdentityBackupError extends Error {
  // code: 'WEAK_PASSWORD' | 'INVALID_FILE' | 'UNSUPPORTED_VERSION' | 'WRONG_PASSWORD'
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function passwordBytes(password) {
  // NFC, so the same password typed on another keyboard or OS still opens it.
  return Buffer.from(String(password).normalize('NFC'), 'utf8')
}

function deriveKey(password, salt, { memlimit, opslimit }) {
  const key = sodium.sodium_malloc(sodium.crypto_secretbox_KEYBYTES)
  sodium.crypto_pwhash(key, passwordBytes(password), salt, opslimit, memlimit, sodium.crypto_pwhash_ALG_ARGON2ID13)
  return key
}

function createIdentityBackup({ courses, createdAt = new Date(), limits = DEFAULT_LIMITS, password, primaryKey, publisherId }) {
  if (typeof password !== 'string' || [...password].length < MIN_PASSWORD_LENGTH) {
    throw new IdentityBackupError('WEAK_PASSWORD', `The password must have at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  if (!Buffer.isBuffer(primaryKey) || primaryKey.length !== 32) {
    throw new IdentityBackupError('INVALID_FILE', 'The identity key must be 32 bytes')
  }

  const salt = Buffer.alloc(sodium.crypto_pwhash_SALTBYTES)
  const nonce = Buffer.alloc(sodium.crypto_secretbox_NONCEBYTES)
  sodium.randombytes_buf(salt)
  sodium.randombytes_buf(nonce)

  const payload = Buffer.from(
    JSON.stringify({
      courses: (courses || []).map(({ id, title }) => ({ id: String(id), title: String(title || '') })),
      primaryKey: primaryKey.toString('base64'),
    }),
  )
  const ciphertext = Buffer.alloc(payload.length + sodium.crypto_secretbox_MACBYTES)
  const key = deriveKey(password, salt, limits)
  sodium.crypto_secretbox_easy(ciphertext, payload, nonce, key)
  payload.fill(0)

  return JSON.stringify(
    {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      createdAt: createdAt.toISOString(),
      publisherId,
      kdf: { algorithm: KDF_ALGORITHM, memlimit: limits.memlimit, opslimit: limits.opslimit, salt: salt.toString('base64') },
      cipher: { algorithm: CIPHER_ALGORITHM, nonce: nonce.toString('base64'), ciphertext: ciphertext.toString('base64') },
    },
    null,
    2,
  )
}

function base64(value, length) {
  if (typeof value !== 'string') return null
  const bytes = Buffer.from(value, 'base64')
  return length === undefined || bytes.length === length ? bytes : null
}

// The file's public part, checked: shown before asking for the password.
function readIdentityBackup(text) {
  let file
  try {
    file = JSON.parse(text)
  } catch {
    throw new IdentityBackupError('INVALID_FILE', 'This is not a Matko identity backup')
  }

  if (!file || file.format !== FORMAT) {
    throw new IdentityBackupError('INVALID_FILE', 'This is not a Matko identity backup')
  }
  if (file.formatVersion !== FORMAT_VERSION) {
    throw new IdentityBackupError('UNSUPPORTED_VERSION', 'This backup was made by a newer version of Matko')
  }

  const kdf = file.kdf || {}
  const cipher = file.cipher || {}
  const salt = base64(kdf.salt, sodium.crypto_pwhash_SALTBYTES)
  const nonce = base64(cipher.nonce, sodium.crypto_secretbox_NONCEBYTES)
  const ciphertext = base64(cipher.ciphertext)
  const valid =
    kdf.algorithm === KDF_ALGORITHM &&
    cipher.algorithm === CIPHER_ALGORITHM &&
    Number.isInteger(kdf.opslimit) && kdf.opslimit >= sodium.crypto_pwhash_OPSLIMIT_MIN && kdf.opslimit <= MAX_OPSLIMIT &&
    Number.isInteger(kdf.memlimit) && kdf.memlimit >= sodium.crypto_pwhash_MEMLIMIT_MIN && kdf.memlimit <= MAX_MEMLIMIT &&
    salt && nonce && ciphertext && ciphertext.length > sodium.crypto_secretbox_MACBYTES &&
    typeof file.publisherId === 'string' &&
    typeof file.createdAt === 'string'

  if (!valid) {
    throw new IdentityBackupError('INVALID_FILE', 'This identity backup is damaged')
  }

  return {
    createdAt: file.createdAt,
    publisherId: file.publisherId,
    sealed: { ciphertext, limits: { memlimit: kdf.memlimit, opslimit: kdf.opslimit }, nonce, salt },
  }
}

// The identity and courses inside, with the password. A wrong password and a
// tampered file look the same (the authentication fails): "Wrong password".
function openIdentityBackup(text, password) {
  const backup = readIdentityBackup(text)
  const { ciphertext, limits, nonce, salt } = backup.sealed
  const payload = Buffer.alloc(ciphertext.length - sodium.crypto_secretbox_MACBYTES)
  const key = deriveKey(password, salt, limits)

  if (!sodium.crypto_secretbox_open_easy(payload, ciphertext, nonce, key)) {
    throw new IdentityBackupError('WRONG_PASSWORD', 'Wrong password')
  }

  let contents
  try {
    contents = JSON.parse(payload.toString('utf8'))
  } finally {
    payload.fill(0)
  }

  const primaryKey = base64(contents && contents.primaryKey, 32)
  if (!primaryKey || !Array.isArray(contents.courses)) {
    throw new IdentityBackupError('INVALID_FILE', 'This identity backup is damaged')
  }

  return {
    courses: contents.courses
      .filter((course) => course && typeof course.id === 'string')
      .map((course) => ({ id: course.id, title: typeof course.title === 'string' ? course.title : '' })),
    createdAt: backup.createdAt,
    primaryKey,
    publisherId: backup.publisherId,
  }
}

module.exports = {
  createIdentityBackup,
  IdentityBackupError,
  MIN_PASSWORD_LENGTH,
  openIdentityBackup,
  readIdentityBackup,
}
