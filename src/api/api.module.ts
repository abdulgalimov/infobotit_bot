import { Module } from '@nestjs/common';
import { ReportService } from './report';
import { ApiController } from './api.controller';
import { OrgService } from './org.service';
import { QueueService } from './report/queue.service';
import { RedisManagerModule } from '../redis/redis.module';

@Module({
  imports: [RedisManagerModule],
  controllers: [ApiController],
  providers: [ReportService, OrgService, QueueService],
})
export class ApiModule {}
