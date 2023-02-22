import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as readline from 'readline';
import { CallManager, EntityManager } from '../../database/managers';
import { extractEntityTitle, normalizePhone, timeout } from './utils';
import { CallStatus, CallType, ICall } from '../../types';
import { NotificationService } from '../../telegram/notification.service';

@Injectable()
export class ReportService {
  @Inject(EntityManager)
  private entityManager: EntityManager;

  @Inject(CallManager)
  private callManager: CallManager;

  @Inject(NotificationService)
  private notificationService: NotificationService;

  constructor() {
    //this.readLog();
  }

  async readLog() {
    const fileStream = fs.createReadStream('temp/log.txt');

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const body = JSON.parse(line);
      await this.handleReport(body);
      await timeout(1);
    }
  }

  async newReport(body) {
    await fsPromises.appendFile('temp/log.txt', `${JSON.stringify(body)}\n`);

    await this.handleReport(body);
  }

  async handleReport(body) {
    const { event } = body;

    switch (event) {
      case 'NewCdr':
        return this.newCrdHandler(body);
      case 'CallStatus':
        return this.callStatusHandler(body);
      case 'ExtensionStatus':
        return;
    }
    // console.log('newReport', event);
  }

  async newCrdHandler(body) {
    const { type, dsttrcunkname, srctrunkname, callfrom, callto, status } =
      body;
    let entitySourceName: string;
    let isOut: number;
    let userPhone: string;
    switch (type) {
      case 'Inbound':
        entitySourceName = srctrunkname;
        isOut = 0;
        userPhone = callfrom;
        break;
      case 'Outbound':
        entitySourceName = dsttrcunkname;
        isOut = 1;
        userPhone = callto;
        break;
      default:
        entitySourceName = '';
        break;
    }

    if (userPhone) {
      userPhone = normalizePhone(userPhone);
    }

    const title = extractEntityTitle(entitySourceName);
    const entity = await this.entityManager.findByTitle(title);
    if (!entity) {
      console.error(`entity ${title} not found`);
      return;
    }

    const call: ICall = await this.callManager.create(
      entity.id,
      userPhone,
      type,
      body,
    );

    if (status === CallStatus.NO_ANSWER && type === CallType.Inbound) {
      await this.notificationService.sendMissingCall(entity, call);
    }
  }

  async callStatusHandler(body) {
    if (body.callid === '1677087897.1291532') {
      // console.log('callStatusHandler', JSON.stringify(body, null, 2));
    }
  }
}
