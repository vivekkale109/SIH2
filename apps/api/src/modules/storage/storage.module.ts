import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ClamavService } from './clamav.service';

@Module({
  providers: [StorageService, ClamavService],
  exports: [StorageService, ClamavService],
})
export class StorageModule {}
