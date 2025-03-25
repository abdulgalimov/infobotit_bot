import { Module } from '@nestjs/common';
import { ReportService } from './report';
import { ApiController } from './api.controller';
import { OrgService } from './org.service';
import { QueueService } from './report/queue.service';
import { RedisManagerModule } from '../redis/redis.module';
import { FilesService } from './files.service';
import { It005ApiService } from '../it005/it005.api';
import { ApiService } from './api.service';

@Module({
  imports: [RedisManagerModule],
  controllers: [ApiController],
  providers: [
    ReportService,
    OrgService,
    QueueService,
    FilesService,
    It005ApiService,
    ApiService,
  ],
})
export class ApiModule {}
