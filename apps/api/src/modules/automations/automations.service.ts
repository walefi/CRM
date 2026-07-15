import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);
}
