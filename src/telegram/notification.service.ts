import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import moment from 'moment';
import {
  CallType,
  ICdr,
  IChat,
  Icons,
  ICustomer,
  IOrg,
  NotificationTitles,
} from '../types';
import { NotificationService as NotificationServiceDb } from '../database/services/notification.service';
import { NotificationEntity } from '../database/entities/notification.entity';
import { CdrService } from '../database/services/cdr.service';
import { It005ApiService } from '../it005/it005.api';
import { CustomerService } from '../database/services/customer.service';
import { ConfigService } from '@nestjs/config';
import { DebugConfig } from '../config';
import { timeout } from '../api/report/utils';
import { RedisService } from '../redis/redis.service';
import { InfobotLogger } from '../logger';

@Injectable()
export class NotificationService implements OnApplicationBootstrap {
  @Inject(NotificationServiceDb)
  private notificationServiceDb: NotificationServiceDb;

  @Inject(CdrService)
  private cdrServiceDb: CdrService;

  @Inject(It005ApiService)
  private it005ApiService: It005ApiService;

  @Inject(CustomerService)
  private customerService: CustomerService;

  @Inject(CdrService)
  private cdrService: CdrService;

  @Inject(RedisService)
  private redisService: RedisService;

  private readonly debug: DebugConfig;
  private readonly adminUsers: number[];

  private notificationTitles: NotificationTitles;

  private readonly logger: InfobotLogger;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @InjectBot() private bot: Telegraf,
  ) {
    this.debug = configService.getOrThrow('debug');
    this.adminUsers = configService.getOrThrow('adminUsers');

    this.logger = new InfobotLogger(NotificationService.name);
  }

  public async onApplicationBootstrap() {
    const [notificationTitles] = await Promise.all([
      this.redisService.getNotificationTitles(),
      this.adminUsers.map((userId) =>
        this.bot.telegram.sendMessage(userId, 'Bot restarted'),
      ),
    ]);

    this.notificationTitles = notificationTitles;
  }

  private getCallto(cdr: ICdr): string | null {
    if (this.notificationTitles && this.notificationTitles[cdr.orgId]) {
      const notificationTitleOrg = this.notificationTitles[cdr.orgId];

      if (
        notificationTitleOrg.callto1 &&
        notificationTitleOrg.callto1[cdr.callto1]
      ) {
        return notificationTitleOrg.callto1[cdr.callto1];
      }

      if (
        notificationTitleOrg.callto2 &&
        notificationTitleOrg.callto2[cdr.callto2]
      ) {
        return notificationTitleOrg.callto2[cdr.callto2];
      }
    }

    if (cdr.orgId === 18) {
      switch (cdr.callto1) {
        case '6715':
          return 'Буйнакского';
        case '6716':
          return 'Коркмасово';
      }
    }

    if (cdr.orgId === 10) {
      switch (cdr.callto2) {
        case '1041':
          return 'Турали';
        case '1042':
          return 'Акушинского';
        case '1043':
          return 'А-Султана';
        case '1039':
          return 'Каммаева';
        case '1035':
          return 'Офис';
      }

      return null;
    }
  }

  public async sendMissingCall(cdr: ICdr, org: IOrg, customer: ICustomer) {
    if (this.debug.debugMode) {
      return;
    }

    if (!+org.chatId) {
      this.logger.errorCustom('Not found chat in org', {
        org,
      });
      return;
    }

    const message: string[] = [
      `${orgView(org)}`,
      `${Icons.Phone} Пропущенный вызов: +7${customer.phone}`,
    ];

    const callto = this.getCallto(cdr);
    if (callto) {
      message.push(`Внутренний: ${callto}`);
    }

    message.push('#missing');

    const text = message.join('\n');

    try {
      const result = await this.bot.telegram.sendMessage(org.chatId, text);

      await this.notificationServiceDb.create(
        org.id,
        customer.phone,
        org.chatId,
        result.message_id,
      );
    } catch (error) {
      this.logger.errorCustom('Failed send message to chat', {
        error,
        chatId: org.chatId,
        text,
      });
    }
  }

  public async removeMissingCall(org: IOrg, customer: ICustomer) {
    if (!+org.chatId) {
      return;
    }

    const notifications = await this.notificationServiceDb.findAll(
      customer.phone,
      org.chatId,
    );
    if (!notifications.length) return;
    await Promise.all(
      notifications.map((notification) =>
        this.removeNotification(notification),
      ),
    );
  }

  private async removeNotification(notification: NotificationEntity) {
    await this.notificationServiceDb.delete(notification.id);

    await this.bot.telegram.deleteMessage(
      notification.chatId,
      notification.messageId,
    );
  }

  public async findCallsInOrg(ctx, chat: IChat, org: IOrg, phone: string) {
    const customer: ICustomer = await this.customerService.create(
      org.id,
      phone,
    );

    const cdrs = await this.cdrService.findLastAnswered(customer.id);
    if (!cdrs.length) {
      await this.sendCallsNotfound(ctx, org, phone);
      return;
    }

    await ctx.reply(
      `
${orgView(org)}
Найдено звонков: ${cdrs.length}
Загрузка...`,
      {
        reply_to_message_id: ctx.update?.message?.message_id,
      },
    );

    for (const cdr of cdrs) {
      await this.sendCallToChat(chat.id, org, cdr, customer);
      await timeout(2500);
    }
  }

  private async sendCallsNotfound(ctx, org: IOrg, phone: string) {
    const message = `
${orgView(org)}
Звонков с номером
<code>${phone}</code>
за последние 2 дня не найдено`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_to_message_id: ctx.update?.message?.message_id,
    });
  }

  public async sendCallToChat(
    chatId: number,
    org: IOrg,
    cdr: ICdr,
    customer: ICustomer,
  ) {
    let typeIcon = '';
    switch (cdr.type) {
      case CallType.Inbound:
        typeIcon = Icons.InboundCall;
        break;
      case CallType.Outbound:
        typeIcon = Icons.OutboundCall;
        break;
    }

    const caption = `
${orgView(org)}
${typeIcon} +7${customer.phone}
${Icons.Time} ${moment(cdr.timeStart).format('DD.MM.YYYY HH:mm:ss')}`;

    if (cdr.telegramFileId) {
      await this.bot.telegram.sendAudio(chatId, cdr.telegramFileId, {
        caption,
      });
    } else {
      let downloadUrl: string;
      try {
        downloadUrl = await this.it005ApiService.getDownloadUrl(cdr.recording);
      } catch (error) {
        this.logger.errorCustom('Failed to load audio from server', {
          error,
          recording: cdr.recording,
        });

        return this.bot.telegram.sendMessage(
          chatId,
          `Не удалось загрузить аудио файл: ${cdr.recording}`,
        );
      }

      let sendFileId: string;
      try {
        const result = await this.bot.telegram.sendAudio(
          chatId,
          {
            url: downloadUrl,
          },
          {
            caption,
          },
        );
        sendFileId = result.audio.file_id;
      } catch (error) {
        this.logger.errorCustom('Failed sent audio to telegram', {
          error,
          chatId,
          downloadUrl,
          caption,
        });
        return this.bot.telegram.sendMessage(
          chatId,
          `Не удалось отправить аудио файл: ${downloadUrl}`,
        );
      }

      await this.cdrServiceDb.updateTelegramFileId(cdr.id, sendFileId);
    }
  }
}

function orgView(org: IOrg) {
  return `${Icons.Org} ${org.title}`;
}
