import { Command, Ctx, Update, Hears } from 'nestjs-telegraf';
import { Inject } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import { It005ApiService } from '../it005/it005.api';
import { OrgService } from '../database/services/org.service';
import { HeartbeatService } from '../it005/heartbeat.service';
import { CdrService } from '../database/services/cdr.service';
import { CustomerService } from '../database/services/customer.service';
import { RedisService } from '../redis/redis.service';
import * as process from 'process';
import * as fs from 'fs/promises';

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

  @Inject(RedisService)
  private redis: RedisService;

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

  @Command('error')
  async testError(@Ctx() ctx) {
    setInterval(() => {
      throw new Error('');
    }, 1000);
  }

  @Command('restart')
  async restart(@Ctx() ctx) {
    console.log('restarting...');
    await ctx.reply('Restarting after 3s ...');
    setTimeout(() => {
      process.exit(0);
    }, 3000);
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

  @Hears(/!logs(\s+(?<action>set|off)(\s+(?<template>.+))?)?/)
  private async showLogs(@Ctx() ctx) {
    if (!ctx.user.isAdmin) return;

    const { action, template } = ctx.match.groups;
    switch (action) {
      case 'set':
        this.redis.logEnabled = true;
        this.redis.logTemplate = template || '';
        this.redis.save();
        break;
      case 'off':
        this.redis.logEnabled = false;
        this.redis.save();
        break;
    }

    await ctx.reply(`
on: ${this.redis.logEnabled}
template: ${this.redis.logTemplate}`);
  }

  @Hears(/!redirect(\s+(?<action>set|off)(\s+(?<url>.+))?)?/)
  private async setRedirect(@Ctx() ctx) {
    if (!ctx.user.isAdmin) return;

    const { action, url } = ctx.match.groups;

    switch (action) {
      case 'set':
        this.redis.redirectUrls.push(url);
        this.redis.save();
        break;
      case 'off':
        this.redis.redirectUrls = [];
        this.redis.save();
        break;
      case 'get':
        break;
    }
    await ctx.reply(`urls:
${this.redis.redirectUrls.join('\n')}`);
  }

  @Hears(/!file\s+(?<filename>.+)/)
  private async getFile(@Ctx() ctx) {
    console.log('getFile', ctx.user.isAdmin);
    if (!ctx.user.isAdmin) return;

    try {
      const { filename } = ctx.match.groups;
      console.log('filename', filename);

      const file = await fs.readFile(filename);
      await ctx.telegram.sendDocument(ctx.from.id, {
        source: file,
        filename,
      });
    } catch (err) {
      await ctx.reply(err.message);
    }
  }
}
