import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
}
