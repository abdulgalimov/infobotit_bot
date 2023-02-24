import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as readline from 'readline';
import { extractOrgTitle, normalizePhone, timeout } from './utils';
import { CallStatus, CallType, ICdr } from '../../types';
import { NotificationService } from '../../telegram/notification.service';
import { OrgService } from '../../database/services/org.service';
import { CdrService } from '../../database/services/cdr.service';

@Injectable()
export class ReportService {
  @Inject(OrgService)
  private orgService: OrgService;

  @Inject(CdrService)
  private cdrService: CdrService;

  @Inject(NotificationService)
  private notificationService: NotificationService;

  constructor() {
    this.readLog();
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

    // await this.handleReport(body);
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
    let orgSourceName: string;
    let isOut: number;
    let userPhone: string;
    switch (type) {
      case 'Inbound':
        orgSourceName = srctrunkname;
        isOut = 0;
        userPhone = callfrom;
        break;
      case 'Outbound':
        orgSourceName = dsttrcunkname;
        isOut = 1;
        userPhone = callto;
        break;
      default:
        orgSourceName = '';
        break;
    }

    if (userPhone) {
      userPhone = normalizePhone(userPhone);
    }

    const title = extractOrgTitle(orgSourceName);
    const org = await this.orgService.findByTitle(title);
    if (!org) {
      console.error(`org ${title} not found`);
      return;
    }

    const call: ICdr = await this.cdrService.create(
      org.id,
      userPhone,
      type,
      body,
    );

    if (status === CallStatus.NO_ANSWER && type === CallType.Inbound) {
      await this.notificationService.sendMissingCall(org, call);
    }

    if (status === CallStatus.ANSWERED) {
      await this.notificationService.removeMissingCall(org, call);
    }
  }

  async callStatusHandler(body) {
    if (body.callid === '1677087897.1291532') {
      // console.log('callStatusHandler', JSON.stringify(body, null, 2));
    }
  }
}
