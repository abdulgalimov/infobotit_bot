import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report';
import { EntityService } from './entity.service';
import { CreateEntityDto, InputRequest } from '../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Api')
@Controller('api')
export class ApiController {
  constructor(
    private readonly reportService: ReportService,
    private readonly entityService: EntityService,
  ) {}

  @Post('entities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: CreateEntityDto,
  })
  async createEntity(
    @Request() req: InputRequest,
    @Body() body: CreateEntityDto,
  ) {
    return this.entityService.create(req, body);
  }

  @Get('entities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async getEntitiesList() {
    return this.entityService.getList();
  }

  @Delete('entities/:id')
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: 'number',
  })
  @UseGuards(JwtAuthGuard)
  async deleteEntity(@Param() params) {
    return this.entityService.delete(+params.id);
  }

  @Post('report')
  async reports(@Body() body) {
    await this.reportService.newReport(body.body || body);
  }
}
