import { Command, Ctx, Start, Update, Hears } from 'nestjs-telegraf';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { ICdr, IChat, ICustomer, IOrg } from '../types';
import { It005ApiService } from '../it005/it005.api';
import { OrgService } from '../database/services/org.service';
import { CdrService } from '../database/services/cdr.service';
import { CustomerService } from '../database/services/customer.service';
import { HeartbeatService } from '../it005/heartbeat.service';

@Update()
export class UpdateService {
  @Inject(AuthService)
  private authService: AuthService;

  @Inject(OrgService)
  private orgService: OrgService;

  @Inject(CdrService)
  private cdrService: CdrService;

  @Inject(CustomerService)
  private customerService: CustomerService;

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

    await Promise.all(orgs.map((org) => this.findCallsInOrg(chat, org, phone)));
  }

  private async findCallsInOrg(chat: IChat, org: IOrg, phone: string) {
    const customer: ICustomer = await this.customerService.create(
      org.id,
      phone,
    );
    const cdrs = await this.cdrService.findLastAnswered(customer.id);
    if (!cdrs.length) {
      await this.notificationService.sendCallsNotfound(chat, org, phone);
    }
    await Promise.all(
      cdrs.map((cdr) => this.sendCallToChat(chat, org, cdr, customer)),
    );
  }

  async sendCallToChat(chat: IChat, org: IOrg, cdr: ICdr, customer: ICustomer) {
    await this.notificationService.sendCallToChat(chat, org, cdr, customer);
  }
}
