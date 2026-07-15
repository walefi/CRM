import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto, UserFilterDto } from './dto/users.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: UserFilterDto) {
    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.teamId) {
      where.teamId = filters.teamId;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (filters.sortBy) {
      (orderBy as any)[filters.sortBy] = filters.sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
          timezone: true,
          language: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          team: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
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
        timezone: true,
        language: true,
        lastLoginAt: true,
        lastLoginIp: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        team: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title,
        phone: dto.phone,
        timezone: dto.timezone || 'America/Sao_Paulo',
        language: dto.language || 'pt-BR',
        role: dto.role || 'user',
        status: 'ACTIVE',
        teamId: dto.teamId,
        departmentId: dto.departmentId,
        tenantId,
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    this.logger.log(`User ${user.email} created in tenant ${tenantId}`);

    return user;
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findById(id, tenantId);

    const user = await this.prisma.user.update({
      where: { id },
      data: dto as any,
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
        timezone: true,
        language: true,
        updatedAt: true,
        team: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`User ${id} updated`);

    return user;
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
        refreshToken: null,
      },
    });

    await this.prisma.session.deleteMany({ where: { userId: id } });

    this.logger.log(`User ${id} soft-deleted`);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
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
        timezone: true,
        language: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async invite(tenantId: string, email: string, role: string = 'user') {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const inviteToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: '',
        firstName: 'Pending',
        lastName: 'User',
        role,
        status: 'INVITED',
        tenantId,
        resetToken: inviteToken,
        resetTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    this.logger.log(`Invitation sent to ${email} for tenant ${tenantId}`);
    this.logger.debug(`Invite token: ${inviteToken}`);

    return { ...user, inviteToken };
  }

  async resendInvite(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, status: 'INVITED' },
    });

    if (!user) {
      throw new NotFoundException('Invite not found');
    }

    const inviteToken = uuidv4();

    await this.prisma.user.update({
      where: { id },
      data: {
        resetToken: inviteToken,
        resetTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.debug(`Invite resent token: ${inviteToken}`);

    return { inviteToken };
  }

  async cancelInvite(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, status: 'INVITED' },
    });

    if (!user) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.user.delete({ where: { id } });

    this.logger.log(`Invite ${id} cancelled`);
  }
}
