import { Command, Ctx, Start, Update, Hears } from 'nestjs-telegraf';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { It005ApiService } from '../it005/it005.api';
import { OrgService } from '../database/services/org.service';
import { HeartbeatService } from '../it005/heartbeat.service';

@Update()
export class UpdateService {
  @Inject(AuthService)
  private authService: AuthService;

  @Inject(OrgService)
  private orgService: OrgService;

  @Inject(NotificationService)
  private notificationService: NotificationService;

  @Inject(It005ApiService)
  private it005ApiService: It005ApiService;

  @Inject(HeartbeatService)
  private heartbeatService: HeartbeatService;

  @Start()
  async start(@Ctx() ctx) {
    console.log('start');
  }

  @Command('api_login')
  async apiLogin(@Ctx() ctx) {
    if (!ctx.user.isAdmin) {
      await ctx.reply('Команда доступна только администратору');
      return;
    }

    await this.it005ApiService.login();
  }

  @Command('api_heartbeat')
  async apiHeartbeat(@Ctx() ctx) {
    if (!ctx.user.isAdmin) {
      await ctx.reply('Команда доступна только администратору');
      return;
    }

    await this.heartbeatService.ping();
  }

  @Command('get_token')
  async getToken(@Ctx() ctx) {
    if (!ctx.user.isAdmin) {
      await ctx.reply('Команда доступна только администратору');
      return;
    }

    const { access_token } = await this.authService.login(ctx.user);

    ctx.reply(`<pre>${access_token}</pre>`, {
      parse_mode: 'HTML',
    });
  }

  @Hears(/^!org\s+(?<orgId>\d+)/)
  async connectOrg(@Ctx() ctx) {
    if (!ctx.user.isAdmin) return;

    const orgId = +ctx.match.groups.orgId;
    const chat = ctx.update.message.chat;
    const org = await this.orgService.findById(orgId);
    if (!org) {
      ctx.reply(`Организация ${orgId} не найдена`);
      return;
    }

    await this.orgService.updateChat(org.id, chat.id);

    await ctx.reply(`Чат подключен к организации "${org.title}"`);
  }

  @Hears(/^((\+7)|8|7)?(?<phone>\d+)$/)
  async findCalls(@Ctx() ctx) {
    const { phone } = ctx.match.groups;
    const chat = ctx.update.message.chat;
    console.log('findCalls', phone);
    if (!chat) return;

    const orgs = await this.orgService.findAllByChat(chat.id);
    if (!orgs.length) {
      console.error(`orgs not found for chat ${chat.id}`);
      return;
    }

    for (const org of orgs) {
      await this.notificationService.findCallsInOrg(ctx, chat, org, phone);
    }
  }
}
