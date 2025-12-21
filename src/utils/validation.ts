import { ValidationError } from './errors';

/**
 * Validates a wallet address with basic checks suitable for a mock system
 * @param wallet - The wallet address to validate
 * @param fieldName - The name of the field (for error messages)
 * @throws ValidationError if validation fails
 */
export function validateWalletAddress(wallet: string, fieldName = 'Wallet address'): void {
  if (!wallet) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (typeof wallet !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const trimmedWallet = wallet.trim();

  if (trimmedWallet.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty or whitespace`);
  }

  if (trimmedWallet.length > 100) {
    throw new ValidationError(`${fieldName} is too long (maximum 100 characters)`);
  }

  if (trimmedWallet.length < 3) {
    throw new ValidationError(`${fieldName} is too short (minimum 3 characters)`);
  }
}
