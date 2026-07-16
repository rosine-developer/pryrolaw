import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;   // user id
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;   // refresh token DB id — used for rotation / revocation
}

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

/** How many seconds until a 7-day refresh token expires */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
