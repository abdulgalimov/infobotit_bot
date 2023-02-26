import { Inject, Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { ICdr, IChat, Icons, ICustomer, IOrg } from '../types';
import { NotificationService as NotificationServiceDb } from '../database/services/notification.service';
import { NotificationEntity } from '../database/entities/notification.entity';
import { CdrService } from '../database/services/cdr.service';
import { It005ApiService } from '../it005/it005.api';

@Injectable()
export class NotificationService {
  @Inject(NotificationServiceDb)
  private notificationServiceDb: NotificationServiceDb;

  @Inject(CdrService)
  private cdrServiceDb: CdrService;

  @Inject(It005ApiService)
  private it005ApiService: It005ApiService;

  constructor(@InjectBot() private bot: Telegraf) {}

  public async sendMissingCall(org: IOrg, customer: ICustomer) {
    if (!+org.chatId) {
      //console.error(`Not found chat in org ${org.id}`);
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

  public async sendCallsNotfound(chat: IChat, org: IOrg, phone: string) {
    const message = `Звонков с номером
<code>${phone}</code>
в организации
<code>${org.title}</code> 
за последние 2 дня не найдено`;
    await this.bot.telegram.sendMessage(chat.id, message, {
      parse_mode: 'HTML',
    });
  }

  public async sendCallToChat(
    chat: IChat,
    org: IOrg,
    cdr: ICdr,
    customer: ICustomer,
  ) {
    const caption = `${Icons.Phone} +7${customer.phone}
${Icons.Time} ${moment(cdr.timeStart).format('DD.MM.YYYY HH:mm:ss')}
${Icons.Org} ${org.title}`;

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
