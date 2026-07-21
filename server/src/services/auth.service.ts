import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
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

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to avoid leaking whether an account exists.
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Persist token in DB
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5174';
    const resetUrl = `${frontend}/reset-password?token=${token}`;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
      return;
    }

    try {
      const resend = new Resend(apiKey);
      const from = process.env.EMAIL_FROM ?? 'Legal Workspace <no-reply@legalworkspace.app>';

      await resend.emails.send({
        from,
        to: email,
        subject: 'Reset your Legal Workspace password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:600;color:#0f172a;margin:0 0 8px">Reset your password</h2>
            <p style="font-size:14px;color:#64748b;margin:0 0 24px">
              Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetUrl}"
              style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;
                     padding:12px 24px;border-radius:8px;text-decoration:none">
              Reset password
            </a>
            <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      console.log(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error('Failed to send password reset email via Resend:', err);
      console.log(`[FALLBACK] Reset link: ${resetUrl}`);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      throw AppError.badRequest('Invalid or expired password reset token.');
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw AppError.notFound('User not found.');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Delete token record
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
  },
};
