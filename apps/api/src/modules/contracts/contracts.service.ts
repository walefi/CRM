import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateContractDto,
  UpdateContractDto,
  ContractFilterDto,
  CreateSignerDto,
  UpdateSignerDto,
} from './dto/contracts.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    owner: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    company: { select: { id: true, name: true } },
    contact: { select: { id: true, firstName: true, lastName: true } },
    deal: { select: { id: true, title: true } },
    quote: { select: { id: true, number: true, title: true } },
    team: { select: { id: true, name: true } },
    signers: { orderBy: { sortOrder: 'asc' as const } },
  };

  private generateNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(1000 + (timestamp.charCodeAt(0) % 1000));
    return `CTR-${year}-${random}`;
  }

  async findAll(tenantId: string, filters: ContractFilterDto) {
    const where: any = { tenantId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { number: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { publicNotes: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (filters.tagged) where.tags = { has: filters.tagged };
    if (filters.minValue || filters.maxValue) {
      where.totalValue = {};
      if (filters.minValue) (where.totalValue as any).gte = filters.minValue;
      if (filters.maxValue) (where.totalValue as any).lte = filters.maxValue;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as any).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as any).lte = new Date(filters.dateTo);
    }
    if (filters.expiringBefore) where.endDate = { lte: new Date(filters.expiringBefore) };
    if (filters.renewingBefore) where.renewalDate = { lte: new Date(filters.renewingBefore) };

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const orderBy: any = filters.sortBy
      ? { [filters.sortBy]: filters.sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.defaultInclude,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data,
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
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        ...this.defaultInclude,
        versions: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, reason: true, createdBy: true, createdAt: true },
        },
        activities: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
        },
        files: { select: { id: true, name: true, mimeType: true, size: true, createdAt: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async create(tenantId: string, dto: CreateContractDto, userId?: string) {
    const number = this.generateNumber();
    const { signers, ...contractData } = dto;

    const createData: any = {
      ...contractData,
      number,
      tenantId,
      ownerId: dto.ownerId || userId,
      createdBy: userId,
    };

    if (signers?.length) {
      createData.signers = {
        create: signers.map((s, i) => ({ ...s, sortOrder: s.sortOrder ?? i })),
      };
    }

    const contract = await this.prisma.contract.create({
      data: createData,
      include: this.defaultInclude,
    });

    await this.createVersion(contract.id, tenantId, 'Criacao do contrato', userId);
    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_CREATED',
        entity: 'Contract',
        entityId: contract.id,
        tenantId,
        userId: userId || '',
      },
    });

    return this.findById(contract.id, tenantId);
  }

  async update(id: string, tenantId: string, dto: UpdateContractDto, userId?: string) {
    await this.findById(id, tenantId);
    const updated = await this.prisma.contract.update({
      where: { id },
      data: dto as any,
      include: this.defaultInclude,
    });

    await this.createVersion(id, tenantId, 'Atualizacao do contrato', userId);
    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_UPDATED',
        entity: 'Contract',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });

    return updated;
  }

  async remove(id: string, tenantId: string, userId?: string) {
    await this.findById(id, tenantId);
    await this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_DELETED',
        entity: 'Contract',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });
  }

  async archive(id: string, tenantId: string, userId?: string) {
    await this.findById(id, tenantId);
    const updated = await this.prisma.contract.update({
      where: { id },
      data: { isArchived: true, status: 'ARCHIVED' },
      include: this.defaultInclude,
    });
    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_ARCHIVED',
        entity: 'Contract',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });
    return updated;
  }

  async restore(id: string, tenantId: string, userId?: string) {
    await this.findById(id, tenantId);
    const updated = await this.prisma.contract.update({
      where: { id },
      data: { isArchived: false, deletedAt: null, status: 'DRAFT' },
      include: this.defaultInclude,
    });
    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_RESTORED',
        entity: 'Contract',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });
    return updated;
  }

  async duplicate(id: string, tenantId: string, userId?: string) {
    const original: any = await this.findById(id, tenantId);
    const createData: any = {
      number: this.generateNumber(),
      title: `${original.title || ''} (Copia)`,
      description: original.description,
      type: original.type,
      category: original.category,
      status: 'DRAFT',
      currency: original.currency,
      totalValue: original.totalValue,
      object: original.object,
      paymentTerms: original.paymentTerms,
      autoRenewal: original.autoRenewal,
      renewalNoticeDays: original.renewalNoticeDays,
      startDate: original.startDate,
      endDate: original.endDate,
      renewalDate: original.renewalDate,
      internalNotes: original.internalNotes,
      publicNotes: original.publicNotes,
      tags: original.tags,
      tenantId,
      dealId: original.dealId,
      companyId: original.companyId,
      contactId: original.contactId,
      customerId: original.customerId,
      ownerId: original.ownerId || userId,
      teamId: original.teamId,
      createdBy: userId,
    };

    if (original.signers?.length) {
      createData.signers = {
        create: original.signers.map((s: any) => ({
          name: s.name,
          email: s.email,
          document: s.document,
          phone: s.phone,
          role: s.role,
          sortOrder: s.sortOrder,
        })),
      };
    }

    const contract = await this.prisma.contract.create({
      data: createData,
      include: this.defaultInclude,
    });
    await this.createVersion(contract.id, tenantId, 'Contrato duplicado', userId);
    return contract;
  }

  async convertFromQuote(tenantId: string, quoteId: string, userId?: string) {
    const quote: any = await this.prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { company: true, contact: true, deal: true, items: { include: { product: true } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.status !== 'ACCEPTED')
      throw new BadRequestException('Only accepted quotes can be converted to contracts');

    const existingContract = await this.prisma.contract.findFirst({ where: { quoteId, tenantId } });
    if (existingContract) throw new BadRequestException('Quote already converted to a contract');

    const createData: any = {
      number: this.generateNumber(),
      title: `Contrato - ${quote.title || quote.number}`,
      description: `Contrato gerado a partir da proposta ${quote.number}`,
      type: 'SERVICE',
      status: 'DRAFT',
      currency: quote.currency,
      totalValue: quote.totalAmount,
      paymentTerms: quote.paymentTerms,
      startDate: new Date(),
      endDate: quote.validUntil,
      tenantId,
      companyId: quote.companyId,
      contactId: quote.contactId,
      dealId: quote.dealId,
      quoteId,
      ownerId: quote.ownerId || userId,
      createdBy: userId,
    };

    const contract = await this.prisma.contract.create({
      data: createData,
      include: this.defaultInclude,
    });

    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_CREATED_FROM_QUOTE',
        entity: 'Contract',
        entityId: contract.id,
        tenantId,
        userId: userId || '',
        metadata: { quoteId },
      },
    });

    await this.createVersion(
      contract.id,
      tenantId,
      `Convertido da proposta ${quote.number}`,
      userId,
    );

    return this.findById(contract.id, tenantId);
  }

  async renew(id: string, tenantId: string, userId?: string) {
    const original: any = await this.findById(id, tenantId);
    if (original.status !== 'ACTIVE' && original.status !== 'SIGNED')
      throw new BadRequestException('Only active or signed contracts can be renewed');

    const createData: any = {
      number: this.generateNumber(),
      title: `${original.title || ''} (Renovacao)`,
      description: original.description,
      type: original.type,
      category: original.category,
      status: 'DRAFT',
      currency: original.currency,
      totalValue: original.totalValue,
      object: original.object,
      paymentTerms: original.paymentTerms,
      autoRenewal: original.autoRenewal,
      renewalNoticeDays: original.renewalNoticeDays,
      startDate: original.endDate || new Date(),
      tenantId,
      companyId: original.companyId,
      contactId: original.contactId,
      dealId: original.dealId,
      ownerId: original.ownerId || userId,
      createdBy: userId,
    };

    const contract = await this.prisma.contract.create({
      data: createData,
      include: this.defaultInclude,
    });

    await this.prisma.contract.update({
      where: { id },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });

    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_RENEWED',
        entity: 'Contract',
        entityId: id,
        tenantId,
        userId: userId || '',
        metadata: { newContractId: contract.id },
      },
    });

    return this.findById(contract.id, tenantId);
  }

  async getStats(tenantId: string) {
    const [total, byStatus, byType, totalValue, active, expiringSoon] = await Promise.all([
      this.prisma.contract.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.contract.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.contract.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
      this.prisma.contract.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { totalValue: true },
      }),
      this.prisma.contract.count({ where: { tenantId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.contract.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['ACTIVE', 'SIGNED'] },
          endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      byStatus,
      byType,
      totalValue: totalValue._sum.totalValue || 0,
      active,
      expiringSoon,
    };
  }

  async addSigner(contractId: string, tenantId: string, dto: CreateSignerDto) {
    await this.findById(contractId, tenantId);
    return this.prisma.contractSigner.create({ data: { ...dto, contractId } });
  }

  async updateSigner(contractId: string, signerId: string, tenantId: string, dto: UpdateSignerDto) {
    await this.findById(contractId, tenantId);
    const now = new Date();
    const updateData: any = { ...dto };
    if (dto.status === 'SIGNED') updateData.signedAt = now;
    if (dto.status === 'SENT') updateData.sentAt = now;
    if (dto.status === 'VIEWED') updateData.viewedAt = now;

    const signer = await this.prisma.contractSigner.update({
      where: { id: signerId },
      data: updateData,
    });

    const allSigned = await this.prisma.contractSigner.findMany({ where: { contractId } });
    if (allSigned.every((s) => s.status === 'SIGNED') && allSigned.length > 0) {
      await this.prisma.contract.update({
        where: { id: contractId },
        data: { status: 'SIGNED', signedAt: new Date() },
      });
      await this.prisma.timeline.create({
        data: {
          action: 'CONTRACT_SIGNED',
          entity: 'Contract',
          entityId: contractId,
          tenantId,
          userId: '',
        },
      });
    }

    return signer;
  }

  async removeSigner(contractId: string, signerId: string, tenantId: string) {
    await this.findById(contractId, tenantId);
    await this.prisma.contractSigner.delete({ where: { id: signerId } });
  }

  async sendForSignature(id: string, tenantId: string, userId?: string) {
    const contract: any = await this.findById(id, tenantId);
    if (contract.status !== 'DRAFT' && contract.status !== 'UNDER_REVIEW')
      throw new BadRequestException('Only draft or under review contracts can be sent');

    await this.prisma.contractSigner.updateMany({
      where: { contractId: id, status: 'PENDING' },
      data: { status: 'SENT', sentAt: new Date() },
    });

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: 'AWAITING_SIGNATURE' },
      include: this.defaultInclude,
    });

    await this.prisma.timeline.create({
      data: {
        action: 'CONTRACT_SENT_FOR_SIGNATURE',
        entity: 'Contract',
        entityId: id,
        tenantId,
        userId: userId || '',
      },
    });

    return updated;
  }

  async getVersions(contractId: string, tenantId: string) {
    await this.findById(contractId, tenantId);
    return this.prisma.contractVersion.findMany({
      where: { contractId },
      orderBy: { version: 'desc' },
    });
  }

  async restoreVersion(contractId: string, versionId: string, tenantId: string, userId?: string) {
    const version = await this.prisma.contractVersion.findFirst({
      where: { id: versionId, contractId },
    });
    if (!version) throw new NotFoundException('Version not found');

    const data = version.data as any;
    await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        title: data.title,
        status: data.status as any,
        totalValue: data.totalValue,
        type: data.type,
        endDate: data.endDate ? new Date(data.endDate) : null,
        internalNotes: data.internalNotes,
        publicNotes: data.publicNotes,
      },
    });

    await this.createVersion(
      contractId,
      tenantId,
      `Restaurado para versao ${version.version}`,
      userId,
    );
    return this.findById(contractId, tenantId);
  }

  private async createVersion(
    contractId: string,
    tenantId: string,
    reason: string,
    userId?: string,
  ) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { signers: true },
    });
    if (!contract) return;

    const lastVersion = await this.prisma.contractVersion.findFirst({
      where: { contractId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version || 0) + 1;

    await this.prisma.contractVersion.create({
      data: {
        contractId,
        version: nextVersion,
        data: JSON.parse(JSON.stringify(contract)),
        reason,
        tenantId,
        createdBy: userId,
      },
    });
  }

  async exportContract(id: string, tenantId: string, format = 'json') {
    const contract: any = await this.findById(id, tenantId);
    if (format === 'csv') {
      let csv = 'Titulo,Numero,Status,Tipo,Valor,Inicio,Fim\n';
      csv += `"${contract.title}","${contract.number}","${contract.status}","${contract.type}","${contract.totalValue}","${contract.startDate}","${contract.endDate}"\n`;
      return csv;
    }
    return contract;
  }
}
