import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
}
