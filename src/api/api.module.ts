import { Module } from '@nestjs/common';
import { ReportService } from './report/report.service';
import { ApiController } from './api.controller';
import { EntityService } from './entity.service';

@Module({
  imports: [],
  controllers: [ApiController],
  providers: [ReportService, EntityService],
})
export class ApiModule {}
