import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { toByteArray, fromByteArray } from 'base64-js'; // For base64 conversions

// Helper: Convert ArrayBuffer to Base64URL string
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper: Convert Base64URL string to ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Convert Base64 string to Uint8Array
function atobArr(base64: string): Uint8Array {
  return toByteArray(base64);
}

// Helper: Convert Uint8Array to Base64 string
function btoaArr(buffer: Uint8Array): string {
  return fromByteArray(buffer);
}

// Helper: Convert ArrayBuffer to Hex string (from viem, simplified)
function buf2hex(buffer: ArrayBuffer): string {
  return new Uint8Array(buffer).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

// Helper: Concatenate Uint8Arrays
function concatUInt8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, val) => acc + val.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}


const CRED_ID_STORE_KEY = 'passkeyCredentialId';

export async function getOrCreatePasskey(): Promise<Uint8Array> {
  try {
    // 1. Check SecureStore for cached credId
    const cachedCredIdBase64Url = await SecureStore.getItemAsync(CRED_ID_STORE_KEY);
    if (cachedCredIdBase64Url) {
      console.log('Found cached credId:', cachedCredIdBase64Url);
      return new Uint8Array(base64UrlToArrayBuffer(cachedCredIdBase64Url));
    }
    console.log('No cached credId found, creating new passkey...');

    // 2. If missing, call navigator.credentials.create()
    // Ensure this runs in a secure context (typically HTTPS, localhost is an exception)
    // For Expo/React Native, this will be handled by the react-native-passkeys module
    // or the built-in WebAuthn capabilities if running in a sufficiently modern WebView.

    const challenge = crypto.getRandomValues(new Uint8Array(32)); // Standard challenge
    const userId = crypto.getRandomValues(new Uint8Array(16)); // User ID, should be stable for the user

    const passkeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer,
      rp: {
        name: 'Nuri Wallet App', // Replace with your app's name
        id: 'nuri.com' // Replace with your Relying Party ID (usually your domain)
        // For Expo Go or dev clients, RP ID might be tricky. For standalone apps, this should be your domain.
        // It needs to match what's configured for associated domains in app.json/app.config.js
      },
      user: {
        id: userId.buffer,
        name: 'user@example.com', // Replace with actual user identifier if available
        displayName: 'User Display Name', // Replace
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], // ES256 and RS256
      authenticatorSelection: {
        residentKey: 'required', // Create a discoverable credential
        requireResidentKey: true,
        userVerification: 'preferred',
      },
      extensions: {
        prf: {
          enabled: true,
        },
      },
      timeout: 60000,
      attestation: 'none', // Or 'direct'/'indirect' depending on requirements
    };

    // @ts-ignore navigator.credentials is available in modern RN WebViews / react-native-passkeys
    const credential = await navigator.credentials.create({ publicKey: passkeyOptions });

    if (!credential || !credential.rawId) {
      throw new Error('Passkey creation failed or rawId is missing.');
    }

    const credId = new Uint8Array(credential.rawId);
    const credIdBase64Url = arrayBufferToBase64Url(credential.rawId);
    console.log('New Passkey created. Credential ID (Base64URL):', credIdBase64Url);

    // 3. Persist rawId (base64url)
    await SecureStore.setItemAsync(CRED_ID_STORE_KEY, credIdBase64Url);
    console.log('Credential ID persisted to SecureStore.');
    return credId;

  } catch (error) {
    console.error('Error in getOrCreatePasskey:', error);
    if (error.name === 'NotAllowedError') {
      // Handle user cancellation or other permission issues
      throw new Error('Passkey operation was not allowed. User might have cancelled.');
    }
    throw error; // Re-throw other errors
  }
}

export async function derivePrfSecret(
  credId: Uint8Array, // This should be the rawId from the credential
  salt: Uint8Array
): Promise<ArrayBuffer> {
  try {
    console.log('Deriving PRF secret with credId (length):', credId.length, 'salt (length):', salt.length);
    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge: crypto.getRandomValues(new Uint8Array(32)).buffer, // Fresh challenge for each get
      allowCredentials: [{
        id: credId.buffer, // Ensure this is ArrayBuffer
        type: 'public-key',
        // transports: ['internal'], // Optional: specify transports if needed
      }],
      userVerification: 'preferred',
      extensions: {
        prf: {
          eval: {
            first: salt.buffer, // salt must be ArrayBuffer
          },
          // Optional: evalByCredential is also possible if you have multiple PRF-enabled credentials
        },
      },
      timeout: 60000,
    };

    // @ts-ignore navigator.credentials is available
    const assertion = await navigator.credentials.get({ publicKey: assertionOptions });

    if (!assertion || !assertion.getClientExtensionResults || !assertion.getClientExtensionResults().prf) {
      throw new Error('PRF extension result not found in assertion.');
    }

    const prfResults = assertion.getClientExtensionResults().prf;
    // According to WebAuthn Level 3, PRF results are under `results` key
    // However, the issue draft shows `assertion.getClientExtensionResults().prf.first`
    // Let's try to support both common ways it might appear, prioritizing `.results.first` if available
    if (prfResults.results && prfResults.results.first) {
        console.log('PRF secret derived (from .results.first)');
        return prfResults.results.first;
    } else if (prfResults.first) {
        console.log('PRF secret derived (from .first)');
        return prfResults.first; // This is what the issue's technical design uses
    } else {
        throw new Error('PRF results.first or prf.first is undefined.');
    }

  } catch (error) {
    console.error('Error in derivePrfSecret:', error);
    if (error.name === 'NotAllowedError') {
      // Handle user cancellation or other permission issues
      throw new Error('Passkey PRF derivation was not allowed. User might have cancelled.');
    }
    // For other errors, it's useful to see the type and message
    throw new Error(`PRF derivation failed: ${error.name} - ${error.message}`);
  }
}

// Export utilities for use elsewhere if needed
export const utils = {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  atobArr,
  btoaArr,
  buf2hex,
  concatUInt8Arrays,
};
