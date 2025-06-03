import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { toByteArray, fromByteArray } from 'base64-js'; // For base64 conversions
import RNPasskeys from 'react-native-passkeys';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

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
const MOCK_PRF_KEY_STORE = 'mockPrfKeys';

// Mock PRF implementation for testing
// In production, this would use actual WebAuthn PRF extension
async function mockStorePrfKey(credId: string, salt: string): Promise<ArrayBuffer> {
  try {
    // Generate a deterministic key based on credId and salt
    const input = `${credId}-${salt}`;
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert hex to ArrayBuffer (use first 32 bytes for AES-256)
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hashHex.substr(i * 2, 2), 16);
    }
    
    // Store the mapping for later retrieval
    const storedKeys = await SecureStore.getItemAsync(MOCK_PRF_KEY_STORE);
    const keys = storedKeys ? JSON.parse(storedKeys) : {};
    const saltBase64 = typeof salt === 'string' ? salt : btoaArr(new Uint8Array(salt));
    keys[`${credId}-${saltBase64}`] = btoaArr(bytes);
    await SecureStore.setItemAsync(MOCK_PRF_KEY_STORE, JSON.stringify(keys));
    
    return bytes.buffer as ArrayBuffer;
  } catch (error) {
    console.error('Error in mockStorePrfKey:', error);
    throw error;
  }
}

async function mockRetrievePrfKey(credId: string, salt: Uint8Array): Promise<ArrayBuffer> {
  try {
    const storedKeys = await SecureStore.getItemAsync(MOCK_PRF_KEY_STORE);
    if (!storedKeys) {
      throw new Error('No PRF keys stored');
    }
    
    const keys = JSON.parse(storedKeys);
    const key = keys[`${credId}-${btoaArr(salt)}`];
    if (!key) {
      // Generate it on the fly if not found (for backward compatibility)
      return mockStorePrfKey(credId, btoaArr(salt));
    }
    
    return atobArr(key).buffer as ArrayBuffer;
  } catch (error) {
    console.error('Error in mockRetrievePrfKey:', error);
    throw error;
  }
}

export async function getOrCreatePasskey(): Promise<Uint8Array> {
  try {
    // 1. Check SecureStore for cached credId
    const cachedCredIdBase64Url = await SecureStore.getItemAsync(CRED_ID_STORE_KEY);
    if (cachedCredIdBase64Url) {
      console.log('Found cached credId:', cachedCredIdBase64Url);
      return new Uint8Array(base64UrlToArrayBuffer(cachedCredIdBase64Url));
    }
    console.log('No cached credId found, creating new passkey...');

    // 2. For testing purposes, generate a mock credential ID
    // In production, this would use react-native-passkeys with PRF support
    console.warn('⚠️ Using MOCK passkey implementation for testing. PRF extension not supported by react-native-passkeys v0.3.3');
    
    const credId = crypto.getRandomValues(new Uint8Array(32));
    const credIdBase64Url = arrayBufferToBase64Url(credId.buffer as ArrayBuffer);
    
    console.log('Mock Passkey created. Credential ID (Base64URL):', credIdBase64Url);

    // 3. Persist rawId (base64url)
    await SecureStore.setItemAsync(CRED_ID_STORE_KEY, credIdBase64Url);
    console.log('Credential ID persisted to SecureStore.');
    
    // Note: In production with proper PRF support, you would:
    // 1. Show biometric prompt
    // 2. Create actual passkey with PRF extension enabled
    // 3. Store the credential ID
    
    return credId;

  } catch (error: any) {
    console.error('Error in getOrCreatePasskey:', error);
    throw error;
  }
}

export async function derivePrfSecret(
  credId: Uint8Array,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  try {
    console.log('Deriving PRF secret with credId (length):', credId.length, 'salt (length):', salt.length);
    console.warn('⚠️ Using MOCK PRF derivation for testing. Real PRF extension not available.');
    
    // For testing: simulate PRF derivation
    // In production with PRF support, this would:
    // 1. Show biometric prompt
    // 2. Use passkey with PRF extension to derive key
    // 3. Return the derived key
    
    const credIdBase64Url = arrayBufferToBase64Url(credId.buffer as ArrayBuffer);
    const prfKey = await mockRetrievePrfKey(credIdBase64Url, salt);
    
    console.log('Mock PRF secret derived');
    return prfKey;

  } catch (error: any) {
    console.error('Error in derivePrfSecret:', error);
    throw new Error(`PRF derivation failed: ${error.message}`);
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
