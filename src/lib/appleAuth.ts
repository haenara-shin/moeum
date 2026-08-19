import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

export class AppleAuthCanceledError extends Error {}

/** SIWA → Firebase. 매 호출마다 새 nonce (spec §2.2 — 재인증 포함) */
export async function signInWithApple(): Promise<void> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  let appleCred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    appleCred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      throw new AppleAuthCanceledError();
    }
    throw e;
  }
  if (!appleCred.identityToken) throw new Error('Apple 인증 토큰을 받지 못했습니다');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCred.identityToken,
    rawNonce,
  });
  await signInWithCredential(auth, credential);
}
