import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);
}
