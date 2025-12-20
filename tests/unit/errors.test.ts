import {
  AppError,
  ValidationError,
  NotFoundError
} from '../../src/utils/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 500);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error instanceof Error).toBe(true);
    });

    it('should default to status code 500', () => {
      const error = new AppError('Test error');

      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status code', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status code', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error instanceof AppError).toBe(true);
    });

    it('should use default message when not provided', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });
  });
});
