import { Inject, Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { ICall, IChat, Icons, IEntity } from '../types';
import { NotificationService as NotificationServiceDb } from '../database/services/notification.service';
import { NotificationEntity } from '../database/entities/notification.entity';

@Injectable()
export class NotificationService {
  @Inject(NotificationServiceDb)
  private notificationServiceDb: NotificationServiceDb;

  constructor(@InjectBot() private bot: Telegraf) {}

  public async sendMissingCall(entity: IEntity, call: ICall) {
    if (!entity.chat) {
      //console.error(`Not found chat in entity ${entity.id}`);
      return;
    }

    const message = `${Icons.Phone} Пропущенный вызов: +7${call.phone}
#missing`;
    const result = await this.bot.telegram.sendMessage(entity.chat.id, message);

    await this.notificationServiceDb.create(
      entity.id,
      call.phone,
      entity.chat.id,
      result.message_id,
    );
  }

  public async removeMissingCall(entity: IEntity, call: ICall) {
    if (!entity.chat) {
      return;
    }

    const notifications = await this.notificationServiceDb.findAll(
      call.phone,
      entity.chat.id,
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

  public async sendCallToChat(chat: IChat, call: ICall, downloadUrl: string) {
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
