/**
 * AES-256-GCM symmetric encryption for sensitive values stored in the database
 * (Gmail OAuth access_token and refresh_token).
 *
 * Key is read from TOKEN_ENCRYPTION_KEY environment variable (64-char hex string).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format: "enc:<iv_b64>:<authTag_b64>:<ciphertext_b64>"
 * The "enc:" prefix lets the decrypt function detect legacy plaintext values
 * and pass them through — ensuring backward compatibility during key rotation.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const ENC_PREFIX = 'enc:'

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a plaintext string.
 * Returns an opaque string that starts with "enc:" and is safe to store.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag   = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

/**
 * Decrypt a value produced by encrypt().
 * If the value does not start with "enc:" it is returned as-is
 * (backward compatibility for values stored before encryption was introduced).
 */
export function decrypt(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) {
    // Legacy plaintext — return as-is so existing connections still work
    return value
  }
  const [, ivB64, authTagB64, ciphertextB64] = value.split(':')
  const key        = getKey()
  const iv         = Buffer.from(ivB64, 'base64')
  const authTag    = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const decipher   = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}

/** True if the value was produced by encrypt() */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX)
}
