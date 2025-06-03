import { renderHook, act } from '@testing-library/react-hooks';
import { useWalletExport } from '../useWalletExport';
import * as passkeyHooks from '../usePasskey';
import * as SecureStore from 'expo-secure-store';
import { usePrivy } from '@privy-io/expo';
import Constants from 'expo-constants';

// Mock dependencies
jest.mock('../usePasskey');
jest.mock('expo-secure-store');
jest.mock('@privy-io/expo', () => ({
  usePrivy: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      privyAppId: 'test-privy-app-id',
    },
  },
}));

global.fetch = jest.fn();
global.crypto.subtle = {
  importKey: jest.fn().mockResolvedValue({} as CryptoKey), // Mock CryptoKey object
  encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(64)), // Mock encrypted ArrayBuffer
} as any;
// crypto.getRandomValues is already mocked in usePasskey.test.ts, assuming jest setup shares mocks or it's globally mocked

describe('useWalletExport', () => {
  const mockGetOrCreatePasskey = passkeyHooks.getOrCreatePasskey as jest.Mock;
  const mockDerivePrfSecret = passkeyHooks.derivePrfSecret as jest.Mock;
  const mockUsePrivy = usePrivy as jest.Mock;

  const mockUser = {
    id: 'user-did',
    wallet: { address: '0x123', publicKey: '0xABC', id: 'wallet-id-123' },
    linkedAccounts: [
      { type: 'wallet', address: '0x123', walletClientType: 'privy', id: 'wallet-id-123' }
    ]
  };
  const mockGetAccessToken = jest.fn().mockResolvedValue('test-access-token');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrCreatePasskey.mockResolvedValue(new Uint8Array([1,2,3])); // Mock credId
    mockDerivePrfSecret.mockResolvedValue(new ArrayBuffer(32)); // Mock PRF key
    mockUsePrivy.mockReturnValue({ user: mockUser, getAccessToken: mockGetAccessToken, loading: false });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ciphertext: passkeyHooks.utils.btoaArr(new Uint8Array(32).fill(1)), // base64 string
        encapsulated_key: passkeyHooks.utils.btoaArr(new Uint8Array(32).fill(2)) // base64 string
      }),
    });
  });

  it('onExport should generate an export payload successfully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWalletExport());

    await act(async () => {
      result.current.onExport();
      await waitForNextUpdate({timeout: 200}); // Adjust timeout if needed
    });

    expect(mockGetOrCreatePasskey).toHaveBeenCalled();
    expect(mockDerivePrfSecret).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalled();
    expect(crypto.subtle.importKey).toHaveBeenCalled();
    expect(crypto.subtle.encrypt).toHaveBeenCalled();
    expect(result.current.exportError).toBeNull();
    expect(result.current.exportResult).not.toBeNull();
    if (result.current.exportResult) {
      const payload = JSON.parse(result.current.exportResult);
      expect(payload).toHaveProperty('credId');
      expect(payload).toHaveProperty('salt');
      expect(payload).toHaveProperty('iv');
      expect(payload).toHaveProperty('blob');
    }
  });

  it('onExport should handle errors from passkey creation', async () => {
    mockGetOrCreatePasskey.mockRejectedValue(new Error('Passkey error'));
    const { result, waitForNextUpdate } = renderHook(() => useWalletExport());

    await act(async () => {
      result.current.onExport();
       // Wait for state update reflecting the error
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.exportError?.message).toBe('Passkey error');
    expect(result.current.exportResult).toBeNull();
  });

  it('onExport should handle errors from Privy API', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    const { result, waitForNextUpdate } = renderHook(() => useWalletExport());

    await act(async () => {
      result.current.onExport();
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.exportError?.message).toContain('Privy export API failed: 500');
    expect(result.current.exportResult).toBeNull();
  });
});
