import { SetMetadata } from '@nestjs/common';
import { REQUIRES_API_KEY } from '../guards/lead-inbound-api-key.guard';

export const RequiresApiKey = () => SetMetadata(REQUIRES_API_KEY, true);
