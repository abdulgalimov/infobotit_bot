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
  UseInterceptors,
  UploadedFile,
  Inject,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ReportService } from './report';
import { OrgService } from './org.service';
import { CreateOrgDto, ICustomer, InputRequest } from '../types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { FilesService } from './files.service';
import { CdrService } from '../database/services/cdr.service';
import { CustomerService } from '../database/services/customer.service';
import { RedisService } from '../redis/redis.service';
import { validateNotificationTitles } from './validator';

@ApiTags('Api')
@Controller('app')
export class ApiController {
  private readonly logger = new Logger('ApiController');
  constructor(
    private readonly reportService: ReportService,
    private readonly orgService: OrgService,
    private readonly filesService: FilesService,
    private readonly cdrService: CdrService,
    private readonly customerService: CustomerService,
    private readonly redisService: RedisService,
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
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async getFile(@Param('filename') filename: string) {
    return this.filesService.getFile(filename);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadFile(file);
  }

  @Get('calls/find/:org_id/:phone')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async callsFind(
    @Param('org_id') orgIdStr: string,
    @Param('phone') phone: string,
  ) {
    const orgId = +orgIdStr;
    if (!orgId) {
      return {
        error: 'invalid org_id',
      };
    }

    const phoneReg = /^((\+7)|8|7)?(?<phone>\d+)$/.exec(phone);
    if (!phoneReg) {
      return {
        error: 'phone format invalid',
      };
    }

    const customer: ICustomer = await this.customerService.create(
      +orgId,
      phoneReg.groups.phone,
    );

    const cdrs = await this.cdrService.findLastAnswered(customer.id);

    return {
      cdrs,
    };
  }

  @Get('notification-titles')
  async getNotificationTitles() {
    return this.redisService.getNotificationTitles();
  }

  @Post('notification-titles')
  @ApiBody({
    schema: {
      type: 'object',
    },
    examples: {
      empty: {
        summary: 'Пустой пример',
        value: {},
      },
      full: {
        summary: 'Заполенный пример',
        value: {
          '10': {
            callto2: {
              '1041': 'Турали',
              '1042': 'Акушинского',
              '1043': 'А-Султана',
              '1039': 'Каммаева',
              '1035': 'Офис',
            },
          },
          '18': {
            callto1: {
              '6715': 'Буйнакского',
              '6716': 'Коркмасово',
            },
          },
        },
      },
    },
  })
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  async setNotificationTitles(@Body() body: object) {
    try {
      validateNotificationTitles(body);
    } catch (error) {
      return {
        error: error.message,
      };
    }
    return this.redisService.setNotificationTitles(body);
  }
}
