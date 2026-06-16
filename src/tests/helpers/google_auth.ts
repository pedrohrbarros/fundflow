import { generateKeyPair, SignJWT } from 'jose'
import { __setJwksForTest } from '../../config/google'

// A single keypair + client ID shared by every test that exercises Google
// ID-token verification. bun's test module registry is process-global, so a
// per-file keypair/client-id could be stomped by another file's setup under
// shared or interleaved execution, producing a key/audience mismatch (verify
// returns null). Installing the SAME values everywhere makes that impossible.
const { privateKey, publicKey } = await generateKeyPair('RS256')

export const TEST_GOOGLE_CLIENT_ID = 'test-client-id'

// Point config/google's JWKS seam at the shared test public key and set the
// expected audience. Call from beforeEach so it is re-asserted before each test.
export function installGoogleTestJwks(): void {
  process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID
  __setJwksForTest(async () => publicKey)
}

// Sign a Google-shaped RS256 ID token with the shared private key. Override
// audience/email_verified to exercise rejection paths.
export function signGoogleIdToken(
  opts: { sub?: string; email?: string; email_verified?: boolean; audience?: string } = {}
): Promise<string> {
  return new SignJWT({
    email: opts.email ?? 'user@gmail.com',
    email_verified: opts.email_verified ?? true,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('https://accounts.google.com')
    .setAudience(opts.audience ?? TEST_GOOGLE_CLIENT_ID)
    .setSubject(opts.sub ?? 'google-sub-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
}
