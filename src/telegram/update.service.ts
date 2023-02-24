import { Command, Ctx, Start, Update, Hears } from 'nestjs-telegraf';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { ICdr, IChat, ICustomer, IOrg } from '../types';
import { It005ApiService } from '../it005/it005.api';
import { OrgService } from '../database/services/org.service';
import { CdrService } from '../database/services/cdr.service';
import { CustomerService } from '../database/services/customer.service';

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
    const calls = await this.cdrService.findLastAnswered(customer.orgId);
    await Promise.all(
      calls.map((call) => this.sendCallToChat(chat, call, customer)),
    );
  }

  async sendCallToChat(chat: IChat, call: ICdr, customer: ICustomer) {
    const downloadUrl: string = await this.it005ApiService.getDownloadUrl(
      call.recording,
    );

    await this.notificationService.sendCallToChat(
      chat,
      call,
      customer,
      downloadUrl,
    );
  }
}
