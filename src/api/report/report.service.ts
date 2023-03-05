import { Inject, Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as readline from 'readline';
import { extractOrgTitle, normalizePhone } from './utils';
import {
  CallStatus,
  CallType,
  FinishStatus,
  ICdr,
  ICustomer,
  IOrg,
} from '../../types';
import { NotificationService } from '../../telegram/notification.service';
import { OrgService } from '../../database/services/org.service';
import { CdrService } from '../../database/services/cdr.service';
import { CustomerService } from '../../database/services/customer.service';
import { ApiConfig, DebugConfig } from '../../config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReportService {
  @Inject(OrgService)
  private orgService: OrgService;

  @Inject(CustomerService)
  private customerService: CustomerService;

  @Inject(CdrService)
  private cdrService: CdrService;

  @Inject(NotificationService)
  private notificationService: NotificationService;

  private readonly debug: DebugConfig;
  private redirectUrls: string[];

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.debug = configService.getOrThrow('debug');
    if (this.debug.loadFromFile) {
      this.readLog();
    }
    const apiConfig = configService.getOrThrow<ApiConfig>('api');
    this.redirectUrls = apiConfig.redirectUrs;
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
    }
  }

  async newReport(body) {
    await fsPromises.appendFile('temp/log.txt', `${JSON.stringify(body)}\n`);
    this.redirectUrls.map((url) => this.redirectTo(url, body));

    if (!this.debug.loadFromFile) {
      await this.handleReport(body);
    }
  }

  private async redirectTo(url: string, body) {
    try {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
        },
      }).catch((err) => {
        console.log('redirect err1', url, err);
      });
    } catch (err) {
      console.log('redirect err2', url, err);
    }
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
    //console.log('new cdr', body);
    const { type, dsttrcunkname, srctrunkname, callfrom, callto, status } =
      body;
    let orgSourceName: string;
    let userPhone: string;
    switch (type) {
      case 'Inbound':
        orgSourceName = srctrunkname;
        userPhone = callfrom;
        break;
      case 'Outbound':
        orgSourceName = dsttrcunkname;
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

    const customer = await this.customerService.create(org.id, userPhone);

    const cdr = await this.cdrService.create(org.id, customer.id, type, body);

    if (cdr.status === CallStatus.NO_ANSWER && type === CallType.Inbound) {
      await this.notificationService.sendMissingCall(org, customer);
    }

    if (cdr.status === CallStatus.ANSWERED) {
      await this.cdrAnswered(org, customer, cdr);
    }
  }

  async cdrAnswered(org: IOrg, customer: ICustomer, cdr: ICdr) {
    await this.notificationService.removeMissingCall(org, customer);

    const lastNotAnswers = await this.cdrService.findLastNoAnswered(
      customer.id,
    );

    if (!lastNotAnswers.length) {
      return;
    }
    let finishStatus: FinishStatus = FinishStatus.NO_ANSWER;
    switch (cdr.type) {
      case CallType.Inbound:
        finishStatus = FinishStatus.USER_CALL;
        break;
      case CallType.Outbound:
        finishStatus = FinishStatus.USER_ANSWER;
        break;
    }

    await Promise.all(
      lastNotAnswers.map((oldCdr) =>
        this.cdrService.updateFinishStatus(oldCdr.id, finishStatus),
      ),
    );
  }

  async callStatusHandler(body) {
    console.log('call status', body);
    switch (body.callid) {
      case '1677405184.1378326':
        // console.log('callStatusHandler', JSON.stringify(body, null, 2));
        break;
      case '1677405489.1378414':
        // console.log('callStatusHandler', JSON.stringify(body, null, 2));
        break;
    }
  }
}
