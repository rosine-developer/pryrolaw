/**
 * AppError — operational errors that should be sent to the client.
 * All other errors are considered programmer errors and produce 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(msg: string) { return new AppError(msg, 400); }
  static unauthorized(msg = 'Unauthorized') { return new AppError(msg, 401); }
  static forbidden(msg = 'Forbidden') { return new AppError(msg, 403); }
  static notFound(msg = 'Not found') { return new AppError(msg, 404); }
  static conflict(msg: string) { return new AppError(msg, 409); }
  static internal(msg = 'Internal server error') { return new AppError(msg, 500); }
}
