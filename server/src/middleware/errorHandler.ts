import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unexpected / programmer error — don't leak internals
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
}
