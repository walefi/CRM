import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiMlService {
  constructor(private readonly prisma: PrismaService) {}

  async getModels(tenantId: string, dto: any) {
    const where: any = { tenantId };
    if (dto.type) where.type = dto.type;
    if (dto.status) where.status = dto.status;
    const page = dto.page || 1; const limit = dto.limit || 20; const skip = (page - 1) * limit;
    const prismaAny = this.prisma as any;
    const [data, total] = await Promise.all([
      prismaAny.aIModel.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' }, include: { features: true } }),
      prismaAny.aIModel.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async createModel(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).aIModel.create({
      data: {
        name: dto.name, type: dto.type || 'classification', framework: dto.framework || 'pytorch',
        version: dto.version || '1.0.0', accuracy: dto.accuracy, f1Score: dto.f1Score,
        metadata: (dto.metadata as any) || {}, tenantId, createdBy: userId,
        features: dto.features?.length ? { create: dto.features.map((f: any) => ({ name: f.name, type: f.type || 'numeric', importance: f.importance || 0, category: f.category })) } : undefined,
      },
      include: { features: true },
    });
  }

  async trainModel(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    await prismaAny.aIModel.update({
      where: { id: dto.modelId },
      data: { status: 'trained', accuracy: null, f1Score: null },
    });
    return { modelId: dto.modelId, accuracy: null, f1Score: null, trainedAt: new Date().toISOString(), message: 'Model marked as trained. Actual training metrics require a configured ML pipeline.' };
  }

  async runInference(tenantId: string, userId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const start = Date.now();
    const confidence = 0;
    const prediction = 0;
    const output = { prediction, confidence, label: 'not_configured' };
    const durationMs = Date.now() - start;

    await prismaAny.inferenceRequest.create({
      data: { modelId: dto.modelId, input: (dto.input as any) || {}, output: output as any, confidence, durationMs, status: 'pending', error: 'AI provider not configured', tenantId, userId },
    });

    return { output, confidence, durationMs, message: 'Inference recorded. Requires configured AI provider for actual predictions.' };
  }

  async getPredictions(tenantId: string) {
    return (this.prisma as any).prediction.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 30 });
  }

  async getFeatures(tenantId: string) {
    return (this.prisma as any).featureStore.findMany({ where: { tenantId }, orderBy: { groupName: 'asc' } });
  }

  async createFeature(tenantId: string, dto: any) {
    return (this.prisma as any).featureStore.upsert({
      where: { name_tenantId: { name: dto.name, tenantId } },
      create: { name: dto.name, groupName: dto.groupName || 'default', type: dto.type || 'numeric', description: dto.description, values: (dto.values as any) || {}, tenantId },
      update: { type: dto.type, values: (dto.values as any) || {}, freshness: new Date(), version: { increment: 1 } },
    });
  }

  async getRegistry(tenantId: string) {
    return (this.prisma as any).aIModel.findMany({
      where: { tenantId }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, type: true, status: true, version: true, accuracy: true, f1Score: true, deployedAt: true, updatedAt: true },
    });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [models, trained, features, inferences, predictions] = await Promise.all([
      prismaAny.aIModel.count({ where: { tenantId } }),
      prismaAny.aIModel.count({ where: { tenantId, status: 'trained' } }),
      prismaAny.featureStore.count({ where: { tenantId } }),
      prismaAny.inferenceRequest.count({ where: { tenantId } }),
      prismaAny.prediction.count({ where: { tenantId } }),
    ]);
    return { totalModels: models, trainedModels: trained, features, totalInferences: inferences, totalPredictions: predictions };
  }
}
