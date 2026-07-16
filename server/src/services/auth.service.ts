import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../lib/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../lib/jwt';
import { AppError } from '../lib/AppError';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: {
    id: string;
    email: string;
    profile: {
      fullName: string;
      firmName: string | null;
      barNumber: string | null;
      primaryJurisdiction: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export const AuthService = {
  async register(email: string, password: string, fullName: string): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict('An account with this email already exists.');

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: { fullName },
        },
      },
      include: { profile: true },
    });

    const tokens = await AuthService._issueTokens(user.id, user.email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
          ? {
              fullName: user.profile.fullName,
              firmName: user.profile.firmName,
              barNumber: user.profile.barNumber,
              primaryJurisdiction: user.profile.primaryJurisdiction,
              avatarUrl: user.profile.avatarUrl,
            }
          : null,
      },
    };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) throw AppError.unauthorized('Invalid email or password.');

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid email or password.');

    const tokens = await AuthService._issueTokens(user.id, user.email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile
          ? {
              fullName: user.profile.fullName,
              firmName: user.profile.firmName,
              barNumber: user.profile.barNumber,
              primaryJurisdiction: user.profile.primaryJurisdiction,
              avatarUrl: user.profile.avatarUrl,
            }
          : null,
      },
    };
  },

  async refresh(token: string): Promise<TokenPair> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    // Look up stored token — single-use rotation
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
      // Possible token reuse — invalidate all tokens for this user
      await prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
      throw AppError.unauthorized('Refresh token reuse detected. Please sign in again.');
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // Issue fresh pair
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppError.unauthorized('User not found.');

    return AuthService._issueTokens(user.id, user.email);
  },

  async logout(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
  },

  async _issueTokens(userId: string, email: string): Promise<TokenPair> {
    const jti = uuidv4();
    const accessToken = signAccessToken({ sub: userId, email });
    const refreshToken = signRefreshToken({ sub: userId, jti });

    await prisma.refreshToken.create({
      data: {
        id: jti,
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    return { accessToken, refreshToken };
  },
};
