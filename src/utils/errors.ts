export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RoutingError extends AppError {
  constructor(message: string) {
    super(message, 500);
    Object.setPrototypeOf(this, RoutingError.prototype);
  }
}

export class ExecutionError extends AppError {
  constructor(message: string) {
    super(message, 500);
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}
