import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/expo';
import { derivePrfSecret, utils } from './usePasskey';
import { privateKeyToAccount } from 'viem/accounts';
import { bytesToHex } from 'viem';

const { base64UrlToArrayBuffer, atobArr, buf2hex, concatUInt8Arrays } = utils;

// Placeholder for unwrapHpke. This is a critical function.
// The actual implementation depends on whether Privy SDK exports a utility for this
// or if it needs to be implemented using WebCrypto with specific HPKE parameters
// (KEM: DHKEM_P256_HKDF_SHA256, KDF: HKDF_SHA256, AEAD: CHACHA20_POLY1305, Mode: BASE)
// and how the 'recipient_public_key: ignored' affects the HPKE context.
// For now, this function will simulate returning a private key if the input matches a mock.
// THIS IS A MOCK AND NEEDS REPLACEMENT/VERIFICATION.
async function unwrapHpke(plainHpkeBlob: ArrayBuffer): Promise<{ privkey: Uint8Array }> {
  console.log('Attempting to unwrap HPKE blob (length):', plainHpkeBlob.byteLength);
  // This is a placeholder. In a real scenario, this would involve complex HPKE decryption.
  // The export flow concatenates ciphertext and encapsulated_key.
  // The HPKE parameters are KEM: DHKEM_P256_HKDF_SHA256, KDF: HKDF_SHA256, AEAD: CHACHA20_POLY1305.
  // If a specific private key is needed for HPKE decryption (corresponding to the public key
  // sent during export), and that public key was a dummy, this step is non-trivial.
  // However, the issue implies a utility or straightforward process.

  // For demonstration, let's assume the last 32 bytes are the private key if the blob isn't empty.
  // This is NOT how HPKE works but serves as a placeholder.
  if (plainHpkeBlob.byteLength >= 32) {
    // Simulate extracting a 32-byte private key.
    // This is highly dependent on the actual structure of the HPKE blob from Privy.
    const pk = new Uint8Array(plainHpkeBlob.slice(plainHpkeBlob.byteLength - 32));
    console.warn('MOCK unwrapHpke: Successfully "unwrapped" a private key (placeholder). Length:', pk.length);
    return { privkey: pk };
  }
  console.error('MOCK unwrapHpke: HPKE blob too short or unwrap failed.');
  throw new Error('Mock HPKE unwrap failed: blob too short or invalid.');
}

// Placeholder for toWIF. Viem does not directly support WIF.
// This would require a Bitcoin utility library or custom implementation.
function toWIF(privKeyBytes: Uint8Array): string {
  console.warn('MOCK toWIF: WIF conversion is not implemented. Returning hex.');
  return bytesToHex(privKeyBytes); // Placeholder
}

export interface DecryptedKeyInfo {
  hex: string;
  wif: string;
}

export function useWalletDecrypt() {
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState<Error | null>(null);
  const [decryptedKeyInfo, setDecryptedKeyInfo] = useState<DecryptedKeyInfo | null>(null);
  const [keyMatchStatus, setKeyMatchStatus] = useState<boolean | null>(null);

  const { user } = usePrivy();

  const clearSensitiveData = useCallback(() => {
    // This function should ideally zero out the memory holding the key.
    // JavaScript makes true memory zeroing difficult.
    // Setting to null is the best we can do to allow garbage collection.
    setDecryptedKeyInfo(null);
    console.log('Decrypted key info cleared from state.');
  }, []);

  const onDecrypt = async (pastedExportPayload: string) => {
    if (!user || !user.wallet || !user.wallet.address) {
      setDecryptError(new Error('User or wallet not available for key verification.'));
      return;
    }
    // This is the public key from the user's current Privy wallet.
    // It's used to verify that the decrypted key matches the current wallet.
    // Ensure it's in a comparable format (e.g., uncompressed hex).
    // user.wallet.publicKey might be in a specific format, adjust as needed.
    // For viem, privateKeyToAccount derives an uncompressed public key.
    const currentWalletPublicKeyHex = user.wallet.publicKey;
    if (!currentWalletPublicKeyHex) {
        setDecryptError(new Error('Current wallet public key not available.'));
        return;
    }


    setDecryptLoading(true);
    setDecryptError(null);
    setDecryptedKeyInfo(null);
    setKeyMatchStatus(null);

    try {
      const {
        credId: credIdBase64Url,
        salt: saltBase64,
        iv: ivBase64,
        blob: blobBase64,
      } = JSON.parse(pastedExportPayload);

      if (!credIdBase64Url || !saltBase64 || !ivBase64 || !blobBase64) {
        throw new Error('Invalid export payload structure.');
      }

      console.log('Parsed payload - credId (base64url):', credIdBase64Url.substring(0,10)+'...');

      const credIdArray = new Uint8Array(base64UrlToArrayBuffer(credIdBase64Url));
      const saltArray = atobArr(saltBase64);
      const ivArray = atobArr(ivBase64);
      const encryptedBlobArrayBuffer = atobArr(blobBase64).buffer;

      console.log('Converted payload data to Uint8Arrays/ArrayBuffers.');

      const prfSecretArrayBuffer = await derivePrfSecret(credIdArray, saltArray);
      const prfSecret = new Uint8Array(prfSecretArrayBuffer);
      console.log('Derived PRF secret for decryption (length):', prfSecret.length);

      const aesKeyImported = await crypto.subtle.importKey('raw', prfSecret, 'AES-GCM', false, ['decrypt']);
      console.log('AES-GCM key imported for decryption.');

      const plainHpkeBlob = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray },
        aesKeyImported,
        encryptedBlobArrayBuffer
      );
      console.log('AES-GCM decryption complete. Plain HPKE blob length:', plainHpkeBlob.byteLength);

      const { privkey: decryptedPrivKeyBytes } = await unwrapHpke(plainHpkeBlob); // Uint8Array
      console.log('HPKE unwrap complete. Decrypted private key (bytes length):', decryptedPrivKeyBytes.length);

      // Verify the private key
      const account = privateKeyToAccount(bytesToHex(decryptedPrivKeyBytes)); // viem expects hex

      // Ensure consistent formatting for comparison (e.g. remove '0x' prefix if one has it and other not)
      // Viem's publicKey is typically 0x prefixed, uncompressed.
      const derivedPublicKeyHex = account.publicKey;
      const privyWalletPublicKeyHex = currentWalletPublicKeyHex.startsWith('0x') ? currentWalletPublicKeyHex : `0x${currentWalletPublicKeyHex}`;

      console.log('Derived public key from decrypted private key:', derivedPublicKeyHex);
      console.log('Current Privy wallet public key:', privyWalletPublicKeyHex);

      if (derivedPublicKeyHex.toLowerCase() === privyWalletPublicKeyHex.toLowerCase()) {
        setKeyMatchStatus(true);
        console.log('Key verification successful: Derived public key matches current wallet public key.');
        const keyInfo = {
          hex: bytesToHex(decryptedPrivKeyBytes),
          wif: toWIF(decryptedPrivKeyBytes), // Placeholder
        };
        setDecryptedKeyInfo(keyInfo);

        // AC-7: Clear key after 60s or on AppState background
        // AppState background handling will be done in the UI component.
        setTimeout(clearSensitiveData, 60000);

      } else {
        setKeyMatchStatus(false);
        console.error('Key verification failed: Derived public key does NOT match current wallet public key.');
        throw new Error('Key mismatch: Decrypted key does not match current wallet.');
      }

    } catch (err) {
      console.error('Error during decryption process:', err);
      setDecryptError(err instanceof Error ? err : new Error(String(err)));
      // Ensure key info is cleared on error
      setDecryptedKeyInfo(null);
      setKeyMatchStatus(null);
    } finally {
      setDecryptLoading(false);
    }
  };

  return {
    onDecrypt,
    decryptLoading,
    decryptError,
    decryptedKeyInfo,
    keyMatchStatus,
    clearSensitiveData, // Expose for manual/AppState clearing
    setDecryptError, // To allow clearing errors from UI
    setDecryptedKeyInfo, // To allow clearing key info from UI
    setKeyMatchStatus, // To allow clearing status from UI
  };
}
