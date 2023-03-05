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
import { ApiConfig, DebugConfig, RuntimeConfig } from '../../config';
import { ConfigService } from '@nestjs/config';
import { CallService } from '../../database/services/call.service';
import { ICall } from '../../types/interfaces/call';
import { CallEntity } from '../../database/entities/call.entity';

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

  @Inject(CallService)
  private callService: CallService;

  private readonly debug: DebugConfig;
  private redirectUrls: string[];
  private runtime: RuntimeConfig;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.debug = configService.getOrThrow('debug');
    if (this.debug.loadFromFile) {
      this.readLog();
    }
    const apiConfig = configService.getOrThrow<ApiConfig>('api');
    this.redirectUrls = apiConfig.redirectUrs;

    this.runtime = configService.getOrThrow<RuntimeConfig>('runtime');
  }

  async readLog() {
    const fileStream = fs.createReadStream('temp/log.txt');

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const body = JSON.parse(line);
      await this.handleReportSafe(body);
    }
  }

  async newReport(body) {
    await fsPromises.appendFile('temp/log.txt', `${JSON.stringify(body)}\n`);
    this.redirectUrls.map((url) => this.redirectTo(url, body));

    if (!this.debug.loadFromFile) {
      await this.handleReportSafe(body);
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

  async handleReportSafe(body) {
    try {
      await this.handleReport(body);
    } catch (err) {
      console.log('Fail handle report', JSON.stringify(body, null, 2));
      throw err;
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
    this.logEvents(body);

    const { type, dsttrcunkname, srctrunkname, callfrom, callto } = body;
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

    const [customer, call] = await Promise.all([
      this.customerService.create(org.id, userPhone),
      this.callService.findById(body.callid),
    ]);
    let cdrStatus: CallStatus;
    if (call?.status === CallStatus.TALK) {
      cdrStatus = CallStatus.ANSWERED;
    } else {
      cdrStatus = CallStatus.NO_ANSWER;
    }

    const [cdr] = await Promise.all([
      this.cdrService.create(org.id, customer.id, type, cdrStatus, body),
      this.callService.deleteById(body.callid),
    ]);

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
    this.logEvents(body);
    if (!body.members.length) return;

    const callId: string = body.callid;
    const currentCall: CallEntity = await this.callService.findById(callId);

    function findExtStatus(status: string): boolean {
      return !!body.members.find(
        (member) => member.ext?.memberstatus === status,
      );
    }

    const member = body.members.find(
      (member) => member['inbound'] || member['outbound'],
    );
    if (!member) {
      return;
    }

    const customerInfo = member['inbound'] || member['outbound'];

    let type: CallType;
    let userPhone: string;
    let orgSourceName: string;
    if (member['inbound']) {
      type = CallType.Inbound;
      userPhone = customerInfo.from;
      orgSourceName = customerInfo.trunkname;
    } else if (member['outbound']) {
      type = CallType.Outbound;
      userPhone = customerInfo.to;
      orgSourceName = customerInfo.trunkname;
    } else {
      throw new Error(`Invalid call type: ${callId}`);
    }

    let status: CallStatus;
    if (!currentCall) {
      status = CallStatus.ALERT;
    } else if (
      type === CallType.Inbound &&
      customerInfo.memberstatus === 'ANSWERED' &&
      findExtStatus('ANSWER')
    ) {
      status = CallStatus.TALK;
    } else if (
      type === CallType.Outbound &&
      customerInfo.memberstatus === 'ANSWER' &&
      findExtStatus('ANSWERED')
    ) {
      status = CallStatus.TALK;
    }

    const title = extractOrgTitle(orgSourceName);
    const org = await this.orgService.findByTitle(title);
    if (!org) {
      console.error(`org ${title} not found`);
      return;
    }

    const customer = await this.customerService.create(org.id, userPhone);

    const call: ICall = {
      callId,
      status,
      type,
      orgId: org.id,
      customerId: customer.id,
      createdAt: new Date(),
    };

    await this.callService.create(call);
  }

  private logEvents(body) {
    if (!this.runtime.logEnabled) return;
    const str = JSON.stringify(body, null, 2);
    if (
      !this.runtime.logTemplate ||
      str.toLowerCase().includes(this.runtime.logTemplate.toLowerCase())
    ) {
      console.log('event: ', str);
    }
  }
}
