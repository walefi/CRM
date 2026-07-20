import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, requestInfo: { ip: string; userAgent: string }) {
    const attemptKey = `${dto.email}:${requestInfo.ip}`;
    this.checkBruteForce(attemptKey);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      this.incrementLoginAttempt(attemptKey);
      await this.audit(null, 'LOGIN_FAILED', 'user', 'unknown', null, requestInfo);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);

    if (!isPasswordValid) {
      this.incrementLoginAttempt(attemptKey);
      await this.audit(user.id, 'LOGIN_FAILED', 'user', user.id, user.tenantId, requestInfo);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.loginAttempts.delete(attemptKey);

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken: tokens.refreshToken,
          lastLoginAt: new Date(),
          lastLoginIp: requestInfo.ip,
          status: user.status === 'INVITED' ? 'ACTIVE' : user.status,
          emailVerifiedAt: user.status === 'INVITED' ? new Date() : user.emailVerifiedAt,
        },
      }),
      this.prisma.session.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          token: tokens.refreshToken,
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    await this.audit(user.id, 'LOGIN', 'user', user.id, user.tenantId, requestInfo);

    this.logger.log(`User ${user.email} logged in`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        avatar: user.avatar,
        emailVerified: !!user.emailVerifiedAt,
      },
    };
  }

  async register(dto: RegisterDto, requestInfo: { ip: string; userAgent: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const result = await this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: dto.tenantName || `${dto.firstName} ${dto.lastName}'s Workspace`,
          slug: `${(dto.tenantName || `${dto.firstName}-${dto.lastName}`).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${uuid().slice(0, 8)}`,
          plan: 'FREE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'admin',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          tenantId: tenant.id,
        },
      });

      return { user, tenant };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.role,
      result.user.tenantId,
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: result.user.id },
        data: {
          refreshToken: tokens.refreshToken,
          lastLoginAt: new Date(),
          lastLoginIp: requestInfo.ip,
        },
      }),
      this.prisma.session.create({
        data: {
          userId: result.user.id,
          tenantId: result.user.tenantId,
          token: tokens.refreshToken,
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    await this.audit(
      result.user.id,
      'REGISTER',
      'user',
      result.user.id,
      result.user.tenantId,
      requestInfo,
    );

    this.logger.log(`New account registered: ${result.user.email}`);

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        tenantId: result.user.tenantId,
        emailVerified: true,
      },
    };
  }

  async refreshToken(refreshToken: string, requestInfo: { ip: string; userAgent: string }) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      const session = await this.prisma.session.findFirst({
        where: {
          token: refreshToken,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        await this.prisma.session.deleteMany({ where: { userId: user.id } });
        throw new UnauthorizedException('Session expired');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: tokens.refreshToken },
        }),
        this.prisma.session.update({
          where: { id: session.id },
          data: {
            token: tokens.refreshToken,
            ip: requestInfo.ip,
            userAgent: requestInfo.userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.session.deleteMany({
        where: { userId, token: refreshToken },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.audit(userId, 'LOGOUT', 'user', userId, null, { ip: 'system', userAgent: 'system' });

    this.logger.log(`User ${userId} logged out`);
  }

  async logoutAll(userId: string) {
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      }),
    ]);

    await this.audit(userId, 'LOGOUT_ALL', 'user', userId, null, {
      ip: 'system',
      userAgent: 'system',
    });

    this.logger.log(`User ${userId} logged out from all devices`);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return;
    }

    const resetToken = uuid();
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    this.logger.log(`Password reset token generated for ${user.email}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    requestInfo: { ip: string; userAgent: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExp: null,
          refreshToken: null,
        },
      }),
      this.prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    await this.audit(user.id, 'PASSWORD_RESET', 'user', user.id, user.tenantId, requestInfo);

    this.logger.log(`Password reset for user ${user.email}`);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    _requestInfo: { ip: string; userAgent: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isCurrentPasswordValid = await argon2.verify(user.password, dto.currentPassword);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, refreshToken: null },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);

    await this.audit(userId, 'PASSWORD_CHANGE', 'user', userId, null, {
      ip: 'system',
      userAgent: 'system',
    });

    this.logger.log(`Password changed for user ${userId}`);
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        resetToken: null,
        resetTokenExp: null,
        status: user.status === 'INVITED' ? 'ACTIVE' : user.status,
      },
    });

    this.logger.log(`Email verified for user ${user.email}`);
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = uuid();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: verificationToken,
        resetTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Verification email resent to ${user.email}`);

    return { message: 'If the email exists, a verification link has been sent' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        title: true,
        role: true,
        status: true,
        tenantId: true,
        lastLoginAt: true,
        lastLoginIp: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      emailVerified: !!user.emailVerifiedAt,
    };
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: false,
      device: this.parseUserAgent(s.userAgent || ''),
      location: this.parseLocation(s.ip || ''),
    }));
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  private async generateTokens(userId: string, email: string, role: string, tenantId: string) {
    const payload = { sub: userId, email, role, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async audit(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string,
    tenantId: string | null,
    requestInfo: { ip: string; userAgent: string },
  ) {
    if (!tenantId) return;
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entity,
          entityId,
          userId,
          tenantId,
          ip: requestInfo.ip,
          userAgent: requestInfo.userAgent,
          metadata: { timestamp: new Date().toISOString() },
        },
      });
    } catch (error) {
      this.logger.error('Audit log failed', error);
    }
  }

  private checkBruteForce(key: string) {
    const attempt = this.loginAttempts.get(key);
    if (!attempt) return;

    if (attempt.lockedUntil > Date.now()) {
      throw new UnauthorizedException('Too many login attempts. Please try again later.');
    }

    if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
      this.loginAttempts.delete(key);
    }
  }

  private incrementLoginAttempt(key: string) {
    const attempt = this.loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
    attempt.count++;

    if (attempt.count >= 5) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
      this.logger.warn(`Account locked due to brute force: ${key}`);
    }

    this.loginAttempts.set(key, attempt);

    setTimeout(
      () => {
        this.loginAttempts.delete(key);
      },
      15 * 60 * 1000,
    );
  }

  private parseUserAgent(userAgent: string) {
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return { browser, os, raw: userAgent };
  }

  private parseLocation(ip: string) {
    return { ip, country: 'Unknown', city: 'Unknown' };
  }
}
