import { Module, Global } from '@nestjs/common';
import { LocalStorageAdapter } from './local.storage';

@Global()
@Module({
  providers: [
    {
      provide: 'StorageAdapter',
      useClass: LocalStorageAdapter,
    },
  ],
  exports: ['StorageAdapter'],
})
export class StorageModule {}
