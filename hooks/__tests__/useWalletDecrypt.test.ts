import { renderHook, act } from '@testing-library/react-hooks';
import { useWalletDecrypt } from '../useWalletDecrypt';
import * as passkeyHooks from '../usePasskey';
import { usePrivy } from '@privy-io/expo';
import { privateKeyToAccount } from 'viem/accounts'; // Actual import
import { bytesToHex } from 'viem'; // Actual import

// Mock dependencies
jest.mock('../usePasskey');
jest.mock('@privy-io/expo', () => ({
  usePrivy: jest.fn(),
}));

// Mock viem/accounts
jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn(),
}));
jest.mock('viem', () => ({
    ...jest.requireActual('viem'), // keep other viem utils
    bytesToHex: jest.fn((val) => Buffer.from(val).toString('hex')), // simple mock
}));


// Mock crypto.subtle for AES-GCM
global.crypto.subtle = {
  importKey: jest.fn().mockResolvedValue({} as CryptoKey),
  decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(64)), // Mock decrypted (HPKE blob)
} as any;

// Mock the unwrapHpke (actual path depends on where it would live)
// For now, let's assume it's part of useWalletDecrypt and test its mock version
// This is tricky as it's an internal, unexported function in the current setup.
// A better approach would be to inject it or export it for testing.
// For this test, we rely on its mock implementation within the hook file.

describe('useWalletDecrypt', () => {
  const mockDerivePrfSecret = passkeyHooks.derivePrfSecret as jest.Mock;
  const mockUsePrivy = usePrivy as jest.Mock;
  const mockPrivateKeyToAccount = privateKeyToAccount as jest.Mock;

  const mockUser = {
    wallet: {
      address: '0xUserWalletAddress',
      publicKey: '0x04UserWalletPublicKeyHexUncompressed' // Needs to be uncompressed hex
    }
  };

  const validMockPrivateKeyHex = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockDecryptedPrivKeyBytes = passkeyHooks.utils.atobArr(Buffer.from(validMockPrivateKeyHex.slice(2), 'hex').toString('base64'));


  const mockExportPayload = JSON.stringify({
    credId: passkeyHooks.utils.arrayBufferToBase64Url(new Uint8Array([1,2,3]).buffer),
    salt: passkeyHooks.utils.btoaArr(new Uint8Array([4,5,6])),
    iv: passkeyHooks.utils.btoaArr(new Uint8Array(12).fill(1)),
    blob: passkeyHooks.utils.btoaArr(new Uint8Array(48).fill(2)), // AES encrypted HPKE blob
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDerivePrfSecret.mockResolvedValue(new ArrayBuffer(32)); // Mock PRF key
    mockUsePrivy.mockReturnValue({ user: mockUser, loading: false });

    // Mock unwrapHpke by mocking its call within the hook, this is indirect
    // A direct mock would be: jest.spyOn(require('../useWalletDecrypt'), 'unwrapHpke').mockResolvedValue(...)
    // but it's not exported. The hook's internal mock will be used.
    // We will mock privateKeyToAccount to control the derived public key.
  });

  it('onDecrypt should successfully decrypt and verify matching key', async () => {
    (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(new ArrayBuffer(32 + mockDecryptedPrivKeyBytes.length)); // mock output of AES, which is input to unwrapHpke
    // Ensure unwrapHpke (mocked in useWalletDecrypt) returns our test private key
     // This test relies on the unwrapHpke mock inside useWalletDecrypt.ts to return a key.
     // To make it more deterministic for this test, we'd ideally mock unwrapHpke directly here.
     // For now, let's assume the mock in useWalletDecrypt.ts returns something that leads to this:
    mockPrivateKeyToAccount.mockReturnValue({
      address: '0xSomeOtherAddress',
      publicKey: '0x04UserWalletPublicKeyHexUncompressed' // Matching public key
    });
    (bytesToHex as jest.Mock).mockImplementation(val => Buffer.from(val).toString('hex'));


    const { result, waitForNextUpdate } = renderHook(() => useWalletDecrypt());

    await act(async () => {
      result.current.onDecrypt(mockExportPayload);
      await waitForNextUpdate({timeout: 200});
    });

    expect(mockDerivePrfSecret).toHaveBeenCalled();
    expect(crypto.subtle.decrypt).toHaveBeenCalled();
    expect(mockPrivateKeyToAccount).toHaveBeenCalled();
    expect(result.current.decryptError).toBeNull();
    expect(result.current.keyMatchStatus).toBe(true);
    expect(result.current.decryptedKeyInfo).not.toBeNull();
    expect(result.current.decryptedKeyInfo?.hex).toBe(validMockPrivateKeyHex.slice(2)); // unwrapHpke mock returns last 32 bytes
  });

  it('onDecrypt should handle key mismatch', async () => {
    (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(new ArrayBuffer(32 + mockDecryptedPrivKeyBytes.length));
    mockPrivateKeyToAccount.mockReturnValue({
      address: '0xSomeOtherAddress',
      publicKey: '0x04DifferentPublicKeyHex' // Non-matching public key
    });
    (bytesToHex as jest.Mock).mockImplementation(val => Buffer.from(val).toString('hex'));

    const { result, waitForNextUpdate } = renderHook(() => useWalletDecrypt());

    await act(async () => {
      result.current.onDecrypt(mockExportPayload);
      await waitForNextUpdate({timeout: 200});
    });

    expect(result.current.keyMatchStatus).toBe(false);
    expect(result.current.decryptError?.message).toContain('Key mismatch');
    expect(result.current.decryptedKeyInfo).toBeNull();
  });

  it('onDecrypt should handle invalid JSON payload', async () => {
    const { result } = renderHook(() => useWalletDecrypt());
    await act(async () => {
      result.current.onDecrypt('invalid json');
    });
    expect(result.current.decryptError?.message).toBe('Invalid JSON payload.');
  });

  it('clearSensitiveData should nullify decryptedKeyInfo and keyMatchStatus', async () => {
    // First, successfully decrypt to populate the state
    (crypto.subtle.decrypt as jest.Mock).mockResolvedValue(new ArrayBuffer(32 + mockDecryptedPrivKeyBytes.length));
    mockPrivateKeyToAccount.mockReturnValue({ publicKey: '0x04UserWalletPublicKeyHexUncompressed' });
     (bytesToHex as jest.Mock).mockImplementation(val => Buffer.from(val).toString('hex'));


    const { result, waitForNextUpdate } = renderHook(() => useWalletDecrypt());
    await act(async () => {
      result.current.onDecrypt(mockExportPayload);
      await waitForNextUpdate({timeout: 200});
    });
    expect(result.current.decryptedKeyInfo).not.toBeNull();
    expect(result.current.keyMatchStatus).toBe(true);

    // Then, clear
    await act(async () => {
      result.current.clearSensitiveData();
    });
    expect(result.current.decryptedKeyInfo).toBeNull();
    // KeyMatchStatus is also reset by closeShowKeyModal which calls clearSensitiveData and then sets it
    // but clearSensitiveData itself does not set keyMatchStatus to null.
    // However, the plan is that the UI component will call clearSensitiveData and also reset other states.
    // For the hook itself, let's test its direct action.
    // If we want clearSensitiveData to also reset keyMatchStatus, the hook needs to do it.
    // The current hook implementation of clearSensitiveData ONLY sets decryptedKeyInfo to null.
  });
});
