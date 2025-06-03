import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { usePrivy } from '@privy-io/expo'; // To get walletId and privyAppId
import { getOrCreatePasskey, derivePrfSecret, utils } from './usePasskey';
import Constants from 'expo-constants';

const { arrayBufferToBase64Url, btoaArr, concatUInt8Arrays } = utils;

// A placeholder for a dummy secp256k1 public key (base64 encoded)
// In a real scenario, if the key is truly ignored, this might be an empty string
// or a fixed, valid public key. For HPKE, a P-256 public key is expected.
// Let's use a generic placeholder. If the API expects a specific format (e.g. uncompressed P-256),
// this would need to be correctly formatted.
// For now, assuming it's a base64 string of some public key.
const DUMMY_RECIPIENT_PUBLIC_KEY = 'BMRL4A8B2vN+n8fJ3jA0Tj7Zc9fX2oH7Y9c3gJ5sX3k='; // Example dummy key

async function fetchPrivyExport(privyAppId: string, walletId: string, accessToken: string): Promise<{ ciphertext: Uint8Array; encapsulated_key: Uint8Array }> {
  const exportApiUrl = `https://auth.privy.io/api/v1/wallets/${walletId}/export`;
  // Note: The issue stated recipient_public_key is "ignored".
  // We'll send a placeholder. If the API truly ignores it, this is fine.
  // If it requires a valid key of a specific type (even if unused for decryption by us),
  // this placeholder would need to be a correctly formatted key.
  const body = JSON.stringify({
    encryption_type: 'HPKE',
    recipient_public_key: DUMMY_RECIPIENT_PUBLIC_KEY,
  });

  console.log('Fetching Privy export with body:', body);

  // Regarding authentication for this client-side call:
  // The primary authentication for Privy API calls from the client-side SDK context
  // is typically handled by the user's access token.
  // The `privy-app-id` header is standard.
  // Basic Auth (AppID:AppSecret) is for server-to-server calls.
  // We assume Privy's backend uses the user's session (via accessToken) for authorization here.
  const response = await fetch(exportApiUrl, {
    method: 'POST',
    headers: {
      'privy-app-id': privyAppId,
      'Authorization': `Bearer ${accessToken}`, // User's Privy access token
      'Content-Type': 'application/json',
    },
    body: body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Privy export API error response:', errorBody);
    throw new Error(`Privy export API failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  console.log('Privy export API success response:', data);

  if (!data.ciphertext || !data.encapsulated_key) {
    throw new Error('Privy export API response missing ciphertext or encapsulated_key');
  }

  // Assuming ciphertext and encapsulated_key are base64 strings from Privy
  return {
    ciphertext: utils.atobArr(data.ciphertext),
    encapsulated_key: utils.atobArr(data.encapsulated_key),
  };
}

export function useWalletExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<Error | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null); // To store the final JSON string

  const { user, getAccessToken } = usePrivy();
  const privyAppId = Constants.expoConfig?.extra?.privyAppId;

  const onExport = async () => {
    if (!user || !user.wallet || !user.wallet.address) {
      setExportError(new Error('User or wallet not available.'));
      return;
    }
    if (!privyAppId) {
      setExportError(new Error('Privy App ID not configured.'));
      return;
    }

    setExportLoading(true);
    setExportError(null);
    setExportResult(null);

    try {
      const credIdBytes = await getOrCreatePasskey();
      console.log('Passkey credId (bytes length):', credIdBytes.length);

      const salt = crypto.getRandomValues(new Uint8Array(32));
      console.log('Generated salt (bytes length):', salt.length);

      const prfKeyArrayBuffer = await derivePrfSecret(credIdBytes, salt);
      const prfKey = new Uint8Array(prfKeyArrayBuffer); // AES key needs to be Uint8Array
      console.log('Derived PRF key (bytes length):', prfKey.length);


      // Fetch user's access token for Privy API call
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Could not retrieve access token for Privy API.');
      }

      // Determine wallet ID - assuming embedded wallet is the target
      // The Privy User object might have wallet.id or similar for the specific wallet ID.
      // For now, let's assume the primary embedded wallet.
      // The Privy API for export is /v1/wallets/{wallet_id}/export
      // We need the actual ID of the wallet, not just its address.
      // Let's find the embedded wallet from linkedAccounts
      const embeddedWallet = user.linkedAccounts?.find(
        (acc) => acc.type === 'wallet' && acc.walletClientType === 'privy' && acc.address === user.wallet?.address
      );

      if (!embeddedWallet || !embeddedWallet.id) {
        throw new Error('Could not find embedded wallet ID for export.');
      }
      const walletId = embeddedWallet.id;
      console.log('Using walletId for export:', walletId);


      const { ciphertext, encapsulated_key } = await fetchPrivyExport(privyAppId, walletId, accessToken);
      console.log('Received ciphertext length:', ciphertext.length, 'enc_key length:', encapsulated_key.length);

      const hpkeBlob = concatUInt8Arrays([ciphertext, encapsulated_key]);
      console.log('Concatenated HPKE blob length:', hpkeBlob.length);

      const aesKeyImported = await crypto.subtle.importKey('raw', prfKey, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12)); // Recommended IV size for AES-GCM

      const encryptedHpkeBlob = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        aesKeyImported,
        hpkeBlob
      );
      console.log('AES-GCM encryption complete. Encrypted blob length:', encryptedHpkeBlob.byteLength);

      const payload = {
        credId: arrayBufferToBase64Url(credIdBytes.buffer), // Use the original credIdBytes
        salt: btoaArr(salt),
        iv: btoaArr(iv),
        blob: btoaArr(new Uint8Array(encryptedHpkeBlob)),
      };

      setExportResult(JSON.stringify(payload, null, 2));
      console.log('Export payload generated:', payload);

      // AC-4: "credId: base64url(credentialId), // for future PRF calls"
      // This means we should store the `credIdBase64Url` from getOrCreatePasskey, which it already does.
      // The `salt` is part of the exportPayload, so user "stores" it by saving the payload.
      // No specific requirement to store `exportPayload` in SecureStore, just to show it.

    } catch (err) {
      console.error('Error during export process:', err);
      setExportError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setExportLoading(false);
    }
  };

  return { onExport, exportLoading, exportError, exportResult, setExportResult, setExportError };
}
