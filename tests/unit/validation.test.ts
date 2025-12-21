import { validateWalletAddress } from '../../src/utils/validation';
import { ValidationError } from '../../src/utils/errors';

describe('Wallet Validation', () => {
  describe('validateWalletAddress', () => {
    it('should accept valid wallet addresses', () => {
      expect(() => validateWalletAddress('wallet123')).not.toThrow();
      expect(() => validateWalletAddress('user-wallet-address-abc')).not.toThrow();
      expect(() => validateWalletAddress('0x1234567890abcdef')).not.toThrow();
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => validateWalletAddress('')).toThrow(ValidationError);
      expect(() => validateWalletAddress('')).toThrow('Wallet address is required');
    });

    it('should throw ValidationError for null or undefined', () => {
      expect(() => validateWalletAddress(null as any)).toThrow(ValidationError);
      expect(() => validateWalletAddress(undefined as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError for whitespace-only string', () => {
      expect(() => validateWalletAddress('   ')).toThrow(ValidationError);
      expect(() => validateWalletAddress('   ')).toThrow(
        'Wallet address cannot be empty or whitespace'
      );
    });

    it('should throw ValidationError for non-string values', () => {
      expect(() => validateWalletAddress(123 as any)).toThrow(ValidationError);
      expect(() => validateWalletAddress({} as any)).toThrow(ValidationError);
      expect(() => validateWalletAddress([] as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError for too long addresses', () => {
      const longAddress = 'a'.repeat(101);
      expect(() => validateWalletAddress(longAddress)).toThrow(ValidationError);
      expect(() => validateWalletAddress(longAddress)).toThrow(
        'Wallet address is too long (maximum 100 characters)'
      );
    });

    it('should throw ValidationError for too short addresses', () => {
      expect(() => validateWalletAddress('ab')).toThrow(ValidationError);
      expect(() => validateWalletAddress('ab')).toThrow(
        'Wallet address is too short (minimum 3 characters)'
      );
    });

    it('should accept wallet address with exactly 3 characters', () => {
      expect(() => validateWalletAddress('abc')).not.toThrow();
    });

    it('should accept wallet address with exactly 100 characters', () => {
      const maxLengthAddress = 'a'.repeat(100);
      expect(() => validateWalletAddress(maxLengthAddress)).not.toThrow();
    });

    it('should use custom field name in error messages', () => {
      expect(() => validateWalletAddress('', 'Custom Field')).toThrow('Custom Field is required');
      expect(() => validateWalletAddress('   ', 'User Address')).toThrow(
        'User Address cannot be empty or whitespace'
      );
    });

    it('should trim and validate addresses with leading/trailing spaces', () => {
      expect(() => validateWalletAddress('  abc  ')).not.toThrow();
      expect(() => validateWalletAddress('  ab  ')).toThrow(
        'Wallet address is too short (minimum 3 characters)'
      );
    });
  });
});
