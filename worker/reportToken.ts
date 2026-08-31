import type { AdviceReport } from '../src/types.js'

export async function signReport(report: AdviceReport, secret: string): Promise<string> {
  if (!secret) throw new Error('EMAIL_SIGNING_SECRET_MISSING')
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(JSON.stringify(report)))
  return base64UrlEncode(new Uint8Array(signature))
}

export async function verifyEmailToken(report: AdviceReport, secret: string): Promise<boolean> {
  const { emailToken, ...unsigned } = report
  if (!emailToken) return false
  try {
    return crypto.subtle.verify('HMAC', await hmacKey(secret), base64UrlDecode(emailToken), new TextEncoder().encode(JSON.stringify(unsigned)))
  } catch {
    return false
  }
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function base64UrlEncode(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}
