import { Command, Ctx, Start, Update, Hears } from 'nestjs-telegraf';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CallManager, EntityManager } from '../database/managers';
import { NotificationService } from './notification.service';
import { ICall, IChat } from '../types';
import { It005ApiService } from '../it005/it005.api';

@Update()
export class UpdateService {
  @Inject(AuthService)
  private authService: AuthService;

  @Inject(EntityManager)
  private entityManager: EntityManager;

  @Inject(CallManager)
  private callManager: CallManager;

  @Inject(NotificationService)
  private notificationService: NotificationService;

  @Inject(It005ApiService)
  private it005ApiService: It005ApiService;

  @Start()
  async start(@Ctx() ctx) {
    console.log('start');
  }

  @Command('apilogin')
  async apiLogin(@Ctx() ctx) {
    if (!ctx.user.isAdmin) return;

    const { access_token } = await this.authService.login(ctx.user);

    ctx.reply(`<pre>${access_token}</pre>`, {
      parse_mode: 'HTML',
    });
  }

  @Hears(/^!entity\s+(?<entityId>\d+)/)
  async connectEntity(@Ctx() ctx) {
    if (!ctx.user.isAdmin) return;

    const entityId = +ctx.match.groups.entityId;
    const chat = ctx.update.message.chat;
    const entity = await this.entityManager.findById(entityId);
    if (!entity) {
      ctx.reply(`Организация ${entityId} не найдена`);
      return;
    }

    await entity.updateOne({
      chat: {
        id: chat.id,
        title: chat.title,
      },
    });

    await ctx.reply(`Чат подключен к организации "${entity.title}"`);
  }

  @Hears(/^((\+7)|8|7)?(?<phone>\d+)$/)
  async findCalls(@Ctx() ctx) {
    const { phone } = ctx.match.groups;
    const chat = ctx.update.message.chat;
    if (!chat) return;

    const entities = await this.entityManager.findAllByChat(chat.id);
    if (!entities.length) {
      console.error(`entities not found for chat ${chat.id}`);
      return;
    }

    const ids = entities.map((entity) => entity.id);

    const calls = await this.callManager.findLastAnswered(ids, phone);
    await Promise.all(calls.map((call) => this.sendCallToChat(chat, call)));
  }

  async sendCallToChat(chat: IChat, call: ICall) {
    const downloadUrl: string = await this.it005ApiService.getDownloadUrl(
      call.recording,
    );

    await this.notificationService.sendCallToChat(chat, call, downloadUrl);
  }
}
