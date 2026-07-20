import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { BadRequestException } from '@nestjs/common';

describe('WhatsAppTemplateService', () => {
  let service: WhatsAppTemplateService;
  let prismaMock: any;

  const mockTemplate = {
    id: 'tpl-1',
    name: 'welcome_message',
    language: 'pt_BR',
    category: 'UTILITY',
    status: 'APPROVED',
    components: null,
    variables: ['name', 'company'],
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaMock = {
      whatsAppTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      channel: {
        findFirst: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppTemplateService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: EncryptionService,
          useValue: { isAvailable: () => false, decrypt: (v: string) => v },
        },
      ],
    }).compile();

    service = module.get<WhatsAppTemplateService>(WhatsAppTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTemplates', () => {
    it('should return templates for tenant', async () => {
      prismaMock.whatsAppTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplates('tenant-1');

      expect(result).toEqual([mockTemplate]);
      expect(prismaMock.whatsAppTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      prismaMock.whatsAppTemplate.findMany.mockResolvedValue([]);

      await service.getTemplates('tenant-1', { status: 'APPROVED' });

      expect(prismaMock.whatsAppTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', status: 'APPROVED' },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('tenant-1', 'tpl-1');

      expect(result).toEqual(mockTemplate);
    });

    it('should throw if template not found', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(null);

      await expect(service.getTemplate('tenant-1', 'tpl-999')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(null);
      prismaMock.whatsAppTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate('tenant-1', {
        name: 'welcome_message',
        language: 'pt_BR',
        category: 'UTILITY',
        variables: ['name', 'company'],
      });

      expect(result).toEqual(mockTemplate);
      expect(prismaMock.whatsAppTemplate.create).toHaveBeenCalled();
    });

    it('should throw if template with same name exists', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(mockTemplate);

      await expect(
        service.createTemplate('tenant-1', { name: 'welcome_message', language: 'pt_BR' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(mockTemplate);
      prismaMock.whatsAppTemplate.update.mockResolvedValue({
        ...mockTemplate,
        name: 'updated_name',
      });

      const result = await service.updateTemplate('tenant-1', 'tpl-1', { name: 'updated_name' });

      expect(result.name).toBe('updated_name');
    });

    it('should throw if template not found', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(null);

      await expect(service.updateTemplate('tenant-1', 'tpl-999', { name: 'test' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      prismaMock.whatsAppTemplate.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteTemplate('tenant-1', 'tpl-1');

      expect(result).toEqual({ success: true });
    });
  });

  describe('getStatistics', () => {
    it('should return template statistics', async () => {
      prismaMock.whatsAppTemplate.count.mockResolvedValue(5);
      prismaMock.whatsAppTemplate.groupBy
        .mockResolvedValueOnce([
          { status: 'APPROVED', _count: 3 },
          { status: 'PENDING', _count: 2 },
        ])
        .mockResolvedValueOnce([{ category: 'UTILITY', _count: 5 }]);

      const result = await service.getStatistics('tenant-1');

      expect(result.totalTemplates).toBe(5);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byCategory).toHaveLength(1);
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(mockTemplate);
      prismaMock.channel.findFirst.mockResolvedValue({
        credentials: { phoneNumberId: 'pn-1', accessToken: 'token' },
      });
      prismaMock.conversation.findFirst.mockResolvedValue({ id: 'conv-1' });
      prismaMock.message.create.mockResolvedValue({ id: 'msg-1' });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: 'meta-msg-1' }] }),
      });

      const result = await service.sendTemplateMessage('tenant-1', 'user-1', {
        to: '5511999999999',
        templateName: 'welcome_message',
        variables: { name: 'Joao', company: 'CRM' },
      });

      expect(result.messageId).toBe('msg-1');
      expect(result.externalId).toBe('meta-msg-1');
    });

    it('should throw if template not found', async () => {
      prismaMock.whatsAppTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.sendTemplateMessage('tenant-1', 'user-1', {
          to: '5511999999999',
          templateName: 'nonexistent',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
