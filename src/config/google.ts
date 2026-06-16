import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

let _jwks: JWTVerifyGetKey | null = null
function getJwks(): JWTVerifyGetKey {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))
  return _jwks
}

export type GoogleIdentity = { sub: string; email: string }

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  try {
    const { payload } = await jwtVerify(idToken, getJwks(), {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    })
    const sub = typeof payload.sub === 'string' ? payload.sub : null
    const email = typeof payload.email === 'string' ? payload.email : null
    const email_verified = payload.email_verified === true || payload.email_verified === 'true'
    if (!sub || !email || !email_verified) return null
    return { sub, email }
  } catch {
    return null
  }
}

// Test seam: inject a local key resolver to avoid network calls.
export function __setJwksForTest(jwks: JWTVerifyGetKey | null): void {
  _jwks = jwks
}
