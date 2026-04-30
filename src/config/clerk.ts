import { importSPKI, type KeyLike } from 'jose'

let _key: KeyLike | null = null

export async function getClerkPublicKey(): Promise<KeyLike> {
  if (_key) return _key
  const pem = process.env.CLERK_PEM_PUBLIC_KEY
  if (!pem) throw new Error('CLERK_PEM_PUBLIC_KEY environment variable is not set')
  _key = await importSPKI(pem, 'RS256')
  return _key
}
