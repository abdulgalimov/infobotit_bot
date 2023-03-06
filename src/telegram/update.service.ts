import { Command, Ctx, Start, Update, Hears } from 'nestjs-telegraf';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { It005ApiService } from '../it005/it005.api';
import { OrgService } from '../database/services/org.service';
import { HeartbeatService } from '../it005/heartbeat.service';
import { CdrService } from '../database/services/cdr.service';
import { CustomerService } from '../database/services/customer.service';
import { ConfigService } from '@nestjs/config';
import { RuntimeConfig } from '../config';

@Update()
export class UpdateService {
  @Inject(AuthService)
  private authService: AuthService;

  @Inject(OrgService)
  private orgService: OrgService;

  @Inject(CustomerService)
  private customerService: CustomerService;

  @Inject(CdrService)
  private cdrService: CdrService;

  @Inject(NotificationService)
  private notificationService: NotificationService;

  @Inject(It005ApiService)
  private it005ApiService: It005ApiService;

  @Inject(HeartbeatService)
  private heartbeatService: HeartbeatService;

  private runtime: RuntimeConfig;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.runtime = configService.getOrThrow<RuntimeConfig>('runtime');
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

  @Hears(/^\/start cdr_(?<id>\d+)_(?<secret>\d+)$/)
  async showAudio(@Ctx() ctx) {
    const id = +ctx.match.groups.id;
    const secret = +ctx.match.groups.secret;
    if (!secret) {
      await ctx.reply('Звонок не найден');
      return;
    }

    const cdr = await this.cdrService.findById(id);
    if (cdr?.secret !== secret) {
      await ctx.reply('Звонок не найден');
      return;
    }

    const org = await this.orgService.findById(cdr.orgId);
    const customer = await this.customerService.findById(cdr.customerId);

    await this.notificationService.sendCallToChat(
      ctx.user.id,
      org,
      cdr,
      customer,
    );
  }

  @Hears(/!logs\s+(?<action>on|off|get)(\s+(?<template>.+))?/)
  private async showLogs(@Ctx() ctx) {
    const { action, template } = ctx.match.groups;
    if (action === 'get') {
      await ctx.reply(`
on: ${this.runtime.logEnabled}
template: ${this.runtime.logTemplate}`);
      return;
    }

    this.runtime.logEnabled = action === 'on';
    this.runtime.logTemplate = template || '';
  }

  @Hears(/!redirect(\s+(?<action>set|clear)(\s+(?<url>.+))?)?/)
  private async setRedirect(@Ctx() ctx) {
    const { action, url } = ctx.match.groups;

    switch (action) {
      case 'set':
        this.runtime.redirectUrls.push(url);
        break;
      case 'clear':
        this.runtime.redirectUrls = [];
        break;
      case 'get':
        break;
    }
    await ctx.reply(`urls:
${this.runtime.redirectUrls.join('\n')}`);
  }
}
