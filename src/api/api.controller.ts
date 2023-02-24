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
import { OrgService } from './org.service';
import { CreateOrgDto, InputRequest } from '../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Api')
@Controller('api')
export class ApiController {
  constructor(
    private readonly reportService: ReportService,
    private readonly orgService: OrgService,
  ) {}

  @Post('entities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: CreateOrgDto,
  })
  async createEntity(@Request() req: InputRequest, @Body() body: CreateOrgDto) {
    return this.orgService.create(req, body);
  }

  @Get('entities')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async getEntitiesList() {
    return this.orgService.getList();
  }

  @Delete('entities/:id')
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: 'number',
  })
  @UseGuards(JwtAuthGuard)
  async deleteEntity(@Param() params) {
    return this.orgService.delete(+params.id);
  }

  @Post('report')
  async reports(@Body() body) {
    await this.reportService.newReport(body.body || body);
  }
}
