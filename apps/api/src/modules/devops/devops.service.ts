import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DevopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPipelines(tenantId: string) {
    return (this.prisma as any).cICDPipeline.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async runPipeline(tenantId: string, dto: any) {
    const prismaAny = this.prisma as any;
    const pipeline = await prismaAny.cICDPipeline.findFirst({ where: { id: dto.pipelineId, tenantId } });
    if (!pipeline) {
      throw new Error('CI/CD pipeline not found');
    }

    const start = Date.now();
    await prismaAny.cICDPipeline.update({
      where: { id: dto.pipelineId },
      data: { status: 'running', lastRunAt: new Date() },
    });

    const durationMs = Date.now() - start;
    await prismaAny.cICDPipeline.update({
      where: { id: dto.pipelineId },
      data: { status: 'pending', lastStatus: 'pending', durationMs },
    });
    return { pipelineId: dto.pipelineId, success: false, durationMs, message: 'Pipeline execution recorded. Actual CI/CD execution requires external runner configuration.' };
  }

  async getDeployments(tenantId: string) {
    return (this.prisma as any).deployment.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async createDeployment(tenantId: string, userId: string, dto: any) {
    return (this.prisma as any).deployment.create({
      data: { name: dto.name, environment: dto.environment || 'development', version: dto.version || 'latest', strategy: dto.strategy || 'rolling', status: 'pending', pipelineId: dto.pipelineId, notes: dto.notes, tenantId, createdBy: userId },
    });
  }

  async rollback(tenantId: string, dto: any) {
    return (this.prisma as any).deployment.update({
      where: { id: dto.deploymentId }, data: { status: 'rolled_back', rolledBackAt: new Date(), notes: dto.notes },
    });
  }

  async getFeatureFlags(tenantId: string) {
    return (this.prisma as any).featureFlag.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async toggleFeatureFlag(tenantId: string, dto: any) {
    return (this.prisma as any).featureFlag.update({
      where: { id: dto.flagId }, data: { enabled: dto.enabled, rollout: dto.rollout || 0 },
    });
  }

  async getReleases(tenantId: string) {
    return (this.prisma as any).deployment.findMany({ where: { tenantId }, orderBy: { deployedAt: 'desc' }, select: { id: true, name: true, version: true, environment: true, status: true, deployedAt: true }, take: 20 });
  }

  async getStats(tenantId: string) {
    const prismaAny = this.prisma as any;
    const [pipelines, deployments, flags, releases] = await Promise.all([
      prismaAny.cICDPipeline.count({ where: { tenantId } }),
      prismaAny.deployment.count({ where: { tenantId } }),
      prismaAny.featureFlag.count({ where: { tenantId } }),
      prismaAny.deployment.count({ where: { tenantId, status: 'deployed' } }),
    ]);
    return { pipelines, deployments, featureFlags: flags, releases };
  }
}
