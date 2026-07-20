import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

export interface PortalLoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);
  private readonly maxFailedAttempts = 5;
  private readonly lockDurationMinutes = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    tenantId: string,
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<PortalLoginResult> {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.customerPortalUser.findFirst({
      where: { email, tenantId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Conta desativada');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new UnauthorizedException('Conta bloqueada. Tente novamente mais tarde.');
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      const newFailedAttempts = user.failedAttempts + 1;
      const updateData: any = { failedAttempts: newFailedAttempts };
      if (newFailedAttempts >= this.maxFailedAttempts) {
        updateData.lockedUntil = new Date(Date.now() + this.lockDurationMinutes * 60000);
        updateData.status = 'locked';
      }
      await prismaAny.customerPortalUser.update({
        where: { id: user.id },
        data: updateData,
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, tenantId, type: 'portal' };
    const accessToken = this.jwtService.sign(payload);

    const refreshPayload = { sub: user.id, tenantId, type: 'portal-refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: '7d' });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prismaAny.customerPortalSession.create({
      data: {
        userId: user.id,
        accessToken,
        refreshToken,
        ip,
        userAgent,
        expiresAt,
        tenantId,
      },
    });

    await prismaAny.customerPortalUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };
  }

  async logout(tenantId: string, userId: string, accessToken?: string) {
    const prismaAny = this.prisma as any;

    if (accessToken) {
      await prismaAny.customerPortalSession.updateMany({
        where: { userId, tenantId, accessToken, isActive: true },
        data: { isActive: false },
      });
    } else {
      await prismaAny.customerPortalSession.updateMany({
        where: { userId, tenantId, isActive: true },
        data: { isActive: false },
      });
    }

    return { success: true };
  }

  async refresh(tenantId: string, refreshToken: string): Promise<PortalLoginResult> {
    const prismaAny = this.prisma as any;

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (payload.type !== 'portal-refresh' || payload.tenantId !== tenantId) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const session = await prismaAny.customerPortalSession.findFirst({
      where: { refreshToken, userId: payload.sub, tenantId, isActive: true },
    });

    if (!session) {
      throw new UnauthorizedException('Sessão não encontrada');
    }

    const user = await prismaAny.customerPortalUser.findFirst({
      where: { id: payload.sub, tenantId, deletedAt: null },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuário não encontrado ou desativado');
    }

    await prismaAny.customerPortalSession.update({
      where: { id: session.id },
      data: { isActive: false },
    });

    const newPayload = { sub: user.id, email: user.email, tenantId, type: 'portal' };
    const newAccessToken = this.jwtService.sign(newPayload);

    const newRefreshPayload = { sub: user.id, tenantId, type: 'portal-refresh' };
    const newRefreshToken = this.jwtService.sign(newRefreshPayload, { expiresIn: '7d' });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prismaAny.customerPortalSession.create({
      data: {
        userId: user.id,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        ip: session.ip,
        userAgent: session.userAgent,
        expiresAt,
        tenantId,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };
  }

  async register(
    tenantId: string,
    dto: { email: string; password: string; firstName: string; lastName: string; phone?: string },
  ) {
    const prismaAny = this.prisma as any;

    const existing = await prismaAny.customerPortalUser.findFirst({
      where: { email: dto.email, tenantId, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user = await prismaAny.customerPortalUser.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        tenantId,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async resetPassword(tenantId: string, email: string) {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.customerPortalUser.findFirst({
      where: { email, tenantId, deletedAt: null },
    });

    if (!user) {
      return { message: 'Se o email estiver cadastrado, você receberá um link de redefinição.' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, tenantId, type: 'portal-reset' },
      { expiresIn: '1h' },
    );

    return {
      message: 'Se o email estiver cadastrado, você receberá um link de redefinição.',
      resetToken,
    };
  }

  async changePassword(
    tenantId: string,
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.customerPortalUser.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const valid = await argon2.verify(user.password, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const hashedPassword = await argon2.hash(newPassword);

    await prismaAny.customerPortalUser.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prismaAny.customerPortalSession.updateMany({
      where: { userId, tenantId, isActive: true },
      data: { isActive: false },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async getSessions(tenantId: string, userId: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.customerPortalSession.findMany({
      where: { userId, tenantId, isActive: true },
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
