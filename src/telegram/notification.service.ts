import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { CallType, ICdr, IChat, Icons, ICustomer, IOrg } from '../types';
import { NotificationService as NotificationServiceDb } from '../database/services/notification.service';
import { NotificationEntity } from '../database/entities/notification.entity';
import { CdrService } from '../database/services/cdr.service';
import { It005ApiService } from '../it005/it005.api';
import { CustomerService } from '../database/services/customer.service';
import { ConfigService } from '@nestjs/config';
import { DebugConfig } from '../config';
import { timeout } from '../api/report/utils';

@Injectable()
export class NotificationService implements OnModuleInit {
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

  private readonly debug: DebugConfig;
  private readonly adminUsers: number[];

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @InjectBot() private bot: Telegraf,
  ) {
    this.debug = configService.getOrThrow('debug');
    this.adminUsers = configService.getOrThrow('adminUsers');
  }

  public async onModuleInit() {
    await Promise.all(
      this.adminUsers.map((userId) =>
        this.bot.telegram.sendMessage(userId, 'Bot restarted'),
      ),
    );
  }

  public async sendMissingCall(org: IOrg, customer: ICustomer) {
    if (this.debug.debugMode) {
      return;
    }

    if (!+org.chatId) {
      console.error(`Not found chat in org ${org.id}`);
      return;
    }

    const message = `
${orgView(org)}
${Icons.Phone} Пропущенный вызов: +7${customer.phone}
#missing`;
    try {
      const result = await this.bot.telegram.sendMessage(org.chatId, message);

      await this.notificationServiceDb.create(
        org.id,
        customer.phone,
        org.chatId,
        result.message_id,
      );
    } catch (error) {
      console.error('не удалось отправить уведомление в чат');
      console.error(error);
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
    try {
      await this.bot.telegram.deleteMessage(
        notification.chatId,
        notification.messageId,
      );
    } catch (err) {}
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
      } catch (err) {
        return this.bot.telegram.sendMessage(
          chatId,
          'Не удалось загрузить аудио файл',
        );
      }

      const result = await this.bot.telegram.sendAudio(
        chatId,
        {
          url: downloadUrl,
        },
        {
          caption,
        },
      );

      await this.cdrServiceDb.updateTelegramFileId(
        cdr.id,
        result.audio.file_id,
      );
    }
  }
}

function orgView(org: IOrg) {
  return `${Icons.Org} ${org.title}`;
}
