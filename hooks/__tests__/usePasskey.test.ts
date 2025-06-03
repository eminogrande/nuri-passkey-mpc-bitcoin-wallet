import * as SecureStore from 'expo-secure-store';
import { getOrCreatePasskey, derivePrfSecret, utils } from '../usePasskey';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock navigator.credentials
const mockCredentialsCreate = jest.fn();
const mockCredentialsGet = jest.fn();
global.navigator.credentials = {
  create: mockCredentialsCreate,
  get: mockCredentialsGet,
} as any;

// Mock crypto.getRandomValues
global.crypto.getRandomValues = jest.fn((buffer: Uint8Array) => {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}) as any;


describe('usePasskey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('utils', () => {
    it('arrayBufferToBase64Url and base64UrlToArrayBuffer should be inverses', () => {
      const originalString = 'Hello World! This is a test string for base64url conversion.';
      const buffer = new TextEncoder().encode(originalString).buffer;
      const b64url = utils.arrayBufferToBase64Url(buffer);
      const decodedBuffer = utils.base64UrlToArrayBuffer(b64url);
      expect(new Uint8Array(decodedBuffer)).toEqual(new Uint8Array(buffer));
      expect(new TextDecoder().decode(decodedBuffer)).toBe(originalString);
    });

    it('atobArr and btoaArr should be inverses for Uint8Array', () => {
      const originalBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const b64 = utils.btoaArr(originalBytes);
      const decodedBytes = utils.atobArr(b64);
      expect(decodedBytes).toEqual(originalBytes);
    });
  });

  describe('getOrCreatePasskey', () => {
    it('should return cached credId if available', async () => {
      const mockCredIdBase64Url = 'cached-cred-id';
      const mockCredIdBuffer = utils.base64UrlToArrayBuffer(mockCredIdBase64Url);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockCredIdBase64Url);

      const credId = await getOrCreatePasskey();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('passkeyCredentialId');
      expect(credId).toEqual(new Uint8Array(mockCredIdBuffer));
      expect(mockCredentialsCreate).not.toHaveBeenCalled();
    });

    it('should create and store new passkey if not cached', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const mockRawId = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      mockCredentialsCreate.mockResolvedValue({
        rawId: mockRawId,
        id: utils.arrayBufferToBase64Url(mockRawId), // Not directly used by our function but part of spec
        response: {},
        type: 'public-key',
        getClientExtensionResults: () => ({}),
      });

      const credId = await getOrCreatePasskey();
      const expectedBase64Url = utils.arrayBufferToBase64Url(mockRawId);

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('passkeyCredentialId');
      expect(mockCredentialsCreate).toHaveBeenCalled();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('passkeyCredentialId', expectedBase64Url);
      expect(credId).toEqual(new Uint8Array(mockRawId));
    });
  });

  describe('derivePrfSecret', () => {
    it('should derive PRF secret successfully', async () => {
      const mockCredId = new Uint8Array([1, 2, 3]);
      const mockSalt = new Uint8Array([4, 5, 6]);
      const mockPrfResult = new Uint8Array([7, 8, 9]).buffer;

      mockCredentialsGet.mockResolvedValue({
        getClientExtensionResults: () => ({
          prf: { first: mockPrfResult }, // As per issue spec
        }),
      });

      const secret = await derivePrfSecret(mockCredId, mockSalt);
      expect(mockCredentialsGet).toHaveBeenCalledWith(expect.objectContaining({
        extensions: { prf: { eval: { first: mockSalt.buffer } } },
        allowCredentials: [{ id: mockCredId.buffer, type: 'public-key' }],
      }));
      expect(secret).toEqual(mockPrfResult);
    });
  });
});
