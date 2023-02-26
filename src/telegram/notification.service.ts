import { Inject, Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { ICdr, IChat, Icons, ICustomer, IOrg } from '../types';
import { NotificationService as NotificationServiceDb } from '../database/services/notification.service';
import { NotificationEntity } from '../database/entities/notification.entity';
import { CdrService } from '../database/services/cdr.service';
import { It005ApiService } from '../it005/it005.api';
import { CustomerService } from '../database/services/customer.service';

@Injectable()
export class NotificationService {
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

  constructor(@InjectBot() private bot: Telegraf) {}

  public async sendMissingCall(org: IOrg, customer: ICustomer) {
    if (!+org.chatId) {
      console.error(`Not found chat in org ${org.id}`);
      return;
    }

    const message = `${Icons.Phone} Пропущенный вызов: +7${customer.phone}
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

    await Promise.all(
      cdrs.map((cdr) => this.sendCallToChat(chat, org, cdr, customer)),
    );
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

  private async sendCallToChat(
    chat: IChat,
    org: IOrg,
    cdr: ICdr,
    customer: ICustomer,
  ) {
    const caption = `
${orgView(org)}
${Icons.Phone} +7${customer.phone}
${Icons.Time} ${moment(cdr.timeStart).format('DD.MM.YYYY HH:mm:ss')}`;

    if (cdr.telegramFileId) {
      await this.bot.telegram.sendAudio(chat.id, cdr.telegramFileId, {
        caption,
      });
    } else {
      const downloadUrl: string = await this.it005ApiService.getDownloadUrl(
        cdr.recording,
      );

      const result = await this.bot.telegram.sendAudio(
        chat.id,
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
