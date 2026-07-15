import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);
}
