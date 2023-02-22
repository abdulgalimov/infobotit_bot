import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as moment from 'moment';
import { ICall, IChat, Icons, IEntity } from '../types';

@Injectable()
export class NotificationService {
  constructor(@InjectBot() private bot: Telegraf) {}

  public async sendMissingCall(entity: IEntity, call: ICall) {
    if (!entity.chat) {
      //console.error(`Not found chat in entity ${entity.id}`);
      return;
    }

    const message = `${Icons.Phone} Пропущенный вызов: +7${call.phone}
#missing`;
    await this.bot.telegram.sendMessage(entity.chat.id, message);
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
