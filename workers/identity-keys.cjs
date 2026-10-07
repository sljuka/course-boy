// The publisher's signing keys, derived from the identity (SLJ-55).
//
// The identity is a 32-byte key kept by the main process (in the OS keychain,
// or locked with the teacher's password) and handed to the worker in memory.
// The worker's store never holds it: every key pair below is derived on
// demand, with Corestore's own scheme, so the codes of courses published
// before (when the identity was the store's seed) are the same:
//
//   namespace(name) = generichash([namespace, name])        (from 32 zero bytes)
//   seed            = generichash([NS, namespace, name], key=identity)
//   keyPair         = crypto_sign_seed_keypair(seed)
//
// with NS = hypercore-crypto's namespace('corestore', 1)[0]. Checked against
// Corestore in identity-keys.test.mjs, so a Corestore change can't drift away
// from it silently.

const sodium = require('sodium-native')

function generichash(parts, key) {
  const out = Buffer.alloc(32)
  if (key) sodium.crypto_generichash_batch(out, parts, key)
  else sodium.crypto_generichash_batch(out, parts)
  return out
}

// hypercore-crypto's namespace('corestore', 1)[0].
const COMPAT_NS = (() => {
  const ns = Buffer.alloc(33)
  sodium.crypto_generichash(ns.subarray(0, 32), Buffer.from('corestore'))
  ns[32] = 0
  const out = Buffer.alloc(32)
  sodium.crypto_generichash(out, ns)
  return out
})()

const DEFAULT_NAMESPACE = Buffer.alloc(32)

function keyPairFromSeed(seed) {
  const keyPair = {
    publicKey: Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES),
    secretKey: sodium.sodium_malloc(sodium.crypto_sign_SECRETKEYBYTES),
  }
  sodium.crypto_sign_seed_keypair(keyPair.publicKey, keyPair.secretKey, seed)
  seed.fill(0)
  return keyPair
}

function deriveKeyPair(identity, namespace, name) {
  if (!Buffer.isBuffer(identity) || identity.length !== 32) {
    throw new Error('The identity key must be 32 bytes')
  }
  return keyPairFromSeed(generichash([COMPAT_NS, namespace, Buffer.from(name)], identity))
}

// A course's public id (SLJ-55): what its code is derived from, given at its
// first Publish as the publisher's n-th course (n = 0, 1, 2…). A keyed hash
// with the identity's *secret*, so nobody without it can work out a teacher's
// other public ids (and so their codes), while a restore with the identity can
// find every course again by counting n up. 16 base32 characters, the same
// shape as a course id. The course keeps its own (local) id; this one only
// names its place online.
const PUBLIC_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'
const PUBLIC_ID_CONTEXT = Buffer.from('matko-public-course-id')

function publicCourseId(identity, index) {
  if (!Number.isInteger(index) || index < 0 || index > 0xffffffff) {
    throw new Error('A public course number must be a whole number from 0')
  }
  if (!Buffer.isBuffer(identity) || identity.length !== 32) {
    throw new Error('The identity key must be 32 bytes')
  }
  const counter = Buffer.alloc(4)
  counter.writeUInt32BE(index)
  const digest = generichash([PUBLIC_ID_CONTEXT, counter], identity)

  // The first 80 bits, 5 per character.
  let bits = 0
  let value = 0
  let id = ''
  for (const byte of digest.subarray(0, 10)) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      id += PUBLIC_ID_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  return id
}

// The key pair that signs a course's drive, from its public id: its public key
// makes the course's code. (Corestore: `namespace('course-<id>').createKeyPair('db')`.)
function courseKeyPair(identity, publicId) {
  const namespace = generichash([DEFAULT_NAMESPACE, Buffer.from(`course-${publicId}`)])
  return deriveKeyPair(identity, namespace, 'db')
}

// The publisher id shown in source.json. (Corestore: `createKeyPair('creator')`.)
function creatorKeyPair(identity) {
  return deriveKeyPair(identity, DEFAULT_NAMESPACE, 'creator')
}

module.exports = { courseKeyPair, creatorKeyPair, publicCourseId }
