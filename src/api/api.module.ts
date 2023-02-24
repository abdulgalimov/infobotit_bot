import { Module } from '@nestjs/common';
import { ReportService } from './report';
import { ApiController } from './api.controller';
import { OrgService } from './org.service';

@Module({
  imports: [],
  controllers: [ApiController],
  providers: [ReportService, OrgService],
})
export class ApiModule {}
