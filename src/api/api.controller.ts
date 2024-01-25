import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report';
import { OrgService } from './org.service';
import { CreateOrgDto, InputRequest } from '../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';

@ApiTags('Api')
@Controller('api')
export class ApiController {
  private readonly logger = new Logger('ApiController');
  constructor(
    private readonly reportService: ReportService,
    private readonly orgService: OrgService,
  ) {}

  @Post('orgs')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: CreateOrgDto,
  })
  async createOrg(@Request() req: InputRequest, @Body() body: CreateOrgDto) {
    return this.orgService.create(req, body);
  }

  @Get('orgs')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async getOrgsList() {
    return this.orgService.getList();
  }

  @Delete('orgs/:id')
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    type: 'number',
  })
  @UseGuards(JwtAuthGuard)
  async deleteOrg(@Param() params) {
    return this.orgService.delete(+params.id);
  }

  @Post('report')
  async reports(@Body() body) {
    await this.reportService.newReport(body.body || body);
  }

  @Get('file/:filename')
  async getFile(@Param('filename') filename: string) {
    const file = fs.createReadStream(`${process.cwd()}/${filename}`);

    return new StreamableFile(file, {
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
