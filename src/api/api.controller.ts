import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { Express, Response } from 'express';
import { FilesService } from './files.service';
import { CdrService } from '../database/services/cdr.service';
import { CustomerService } from '../database/services/customer.service';
import { RedisService } from '../redis/redis.service';
import { validateNotificationTitles } from './validator';
import { It005ApiService } from '../it005/it005.api';
import { ApiService } from './api.service';
import fs from 'node:fs';
import { InfobotLogger } from '../logger';

@ApiTags('Api')
@Controller('app')
export class ApiController {
  private readonly logger: InfobotLogger;
  constructor(
    private readonly reportService: ReportService,
    private readonly orgService: OrgService,
    private readonly filesService: FilesService,
    private readonly cdrService: CdrService,
    private readonly customerService: CustomerService,
    private readonly redisService: RedisService,
    private readonly it005ApiService: It005ApiService,
    private readonly apiService: ApiService,
  ) {
    this.logger = new InfobotLogger(ApiController.name);
  }

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

  @Get('player/:recording')
  @ApiParam({
    name: 'recording',
  })
  async getPlayer(@Param('recording') recording, @Res() res: Response) {
    const audioUrl = `/app/download-url/${recording}`;
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Аудио плеер - ${recording}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .player-container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 100%;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 24px;
      text-align: center;
    }
    .filename {
      color: #666;
      font-size: 14px;
      text-align: center;
      margin-bottom: 30px;
      word-break: break-all;
    }
    audio {
      width: 100%;
      outline: none;
      border-radius: 10px;
    }
    audio::-webkit-media-controls-panel {
      background: linear-gradient(to right, #667eea, #764ba2);
    }
    .download-btn {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="player-container">
    <h1>🎵 Аудио запись звонка</h1>
    <div class="filename">${recording}</div>
    <audio controls autoplay preload="auto">
      <source src="${audioUrl}" type="audio/mpeg">
      Ваш браузер не поддерживает аудио элемент.
    </audio>
    <a href="${audioUrl}" download="${recording}" class="download-btn">
      ⬇️ Скачать запись
    </a>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('player-embed/:recording')
  @ApiParam({
    name: 'recording',
  })
  async getPlayerEmbed(@Param('recording') recording, @Res() res: Response) {
    const audioUrl = `/app/download-url/${recording}`;
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: transparent;
      padding: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    audio {
      width: 100%;
      outline: none;
    }
    .info {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="info">🎵 ${recording}</div>
  <audio controls autoplay preload="auto">
    <source src="${audioUrl}" type="audio/mpeg">
  </audio>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.send(html);
  }

  @Get('download-url/:recording')
  @ApiParam({
    name: 'recording',
  })
  async getDownloadUrl(@Param('recording') recording, @Res() res: Response) {
    try {
      const downloadUrl = await this.it005ApiService.getDownloadUrl(recording);
      const tempFile = await this.apiService.saveTempFile(downloadUrl);

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${tempFile.name}"`,
      );
      res.setHeader('Content-Type', 'audio/mp3');

      const fileStream = fs.createReadStream(tempFile.name);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        tempFile.removeCallback(); // tmp сам удалит файл
      });
    } catch (error) {
      this.logger.errorCustom('Failed get download url', {
        error,
        recording,
      });
      return null;
    }
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
