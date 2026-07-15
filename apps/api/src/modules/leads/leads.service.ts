import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
}
