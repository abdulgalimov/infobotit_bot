import { Inject, Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { ICdr, IChat, Icons, IOrg } from '../types';
import { NotificationService as NotificationServiceDb } from '../database/services/notification.service';
import { NotificationEntity } from '../database/entities/notification.entity';

@Injectable()
export class NotificationService {
  @Inject(NotificationServiceDb)
  private notificationServiceDb: NotificationServiceDb;

  constructor(@InjectBot() private bot: Telegraf) {}

  public async sendMissingCall(org: IOrg, call: ICdr) {
    if (!org.chatId) {
      //console.error(`Not found chat in org ${org.id}`);
      return;
    }

    const message = `${Icons.Phone} Пропущенный вызов: +7${call.phone}
#missing`;
    const result = await this.bot.telegram.sendMessage(org.chatId, message);

    await this.notificationServiceDb.create(
      org.id,
      call.phone,
      org.chatId,
      result.message_id,
    );
  }

  public async removeMissingCall(org: IOrg, call: ICdr) {
    if (!org.chatId) {
      return;
    }

    const notifications = await this.notificationServiceDb.findAll(
      call.phone,
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

  public async sendCallToChat(chat: IChat, call: ICdr, downloadUrl: string) {
    const caption = `${Icons.Phone} +7${call.phone}
${Icons.Time} ${moment(call.timeStart).format('DD.MM.YYYY HH:mm:ss')}`;

    await this.bot.telegram.sendAudio(
      chat.id,
      {
        url: downloadUrl,
      },
      {
        caption,
      },
    );
  }
}
