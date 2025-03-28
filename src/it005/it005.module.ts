import { Global, Module } from '@nestjs/common';
import { It005ApiService } from './it005.api';
import { HeartbeatService } from './heartbeat.service';

@Module({
  providers: [It005ApiService, HeartbeatService],
  exports: [It005ApiService, HeartbeatService],
})
@Global()
export class It005Module {}
