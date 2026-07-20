import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeadInboundApiKeyService } from '../../modules/leads/lead-inbound-api-key.service';

export const REQUIRES_API_KEY = 'requiresApiKey';

@Injectable()
export class LeadInboundApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(LeadInboundApiKeyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyService: LeadInboundApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresApiKey = this.reflector.getAllAndOverride<boolean>(REQUIRES_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    try {
      const result = await this.apiKeyService.validateApiKey(apiKey);

      request.apiKey = result;
      request.tenantId = result.tenantId;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`API key validation error: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
