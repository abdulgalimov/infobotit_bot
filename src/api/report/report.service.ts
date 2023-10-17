import { Inject, Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import {
  extractOrgTitle,
  getOrgTitleFromCallStatusEvent,
  getOrgTitleFromNewCdrEvent,
  normalizePhone,
} from './utils';
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
import { DebugConfig, RedirectsConfig } from '../../config';
import { ConfigService } from '@nestjs/config';
import { CallService } from '../../database/services/call.service';
import { ICall } from '../../types/interfaces/call';
import { CallEntity } from '../../database/entities/call.entity';
import { QueueService } from './queue.service';
import { RedisService } from '../../redis/redis.service';
import { LocalService } from './local.service';

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

  @Inject(RedisService)
  private redisService: RedisService;

  private readonly debug: DebugConfig;
  private readonly redirects: RedirectsConfig;

  private localService: LocalService;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(QueueService)
    private queueService: QueueService,
  ) {
    // fsPromises.writeFile('temp/log.txt', ``);

    this.debug = configService.getOrThrow('debug');
    this.redirects = configService.get('redirects', null);

    if (this.debug.loadFromFile) {
      this.localService = new LocalService(this, this.debug.loadFromFile);
    }

    this.queueService.onProcess(this.handleReportSafe.bind(this));
    this.queueService.init();
  }

  async newReport(body) {
    if (this.localService) return;

    let orgTitle: string = null;
    switch (body.event) {
      case 'NewCdr':
        orgTitle = getOrgTitleFromNewCdrEvent(body);
        break;
      case 'CallStatus':
        orgTitle = getOrgTitleFromCallStatusEvent(body);
        if (!orgTitle) return;
        break;
      case 'PlayPromptEnd':
        orgTitle = getOrgTitleFromCallStatusEvent(body);
        break;
      case 'ExtensionStatus':
        return;
    }
    if (!orgTitle) {
      console.log('get org fail', JSON.stringify(body, null, 2));
    }

    if (this.redirects && this.redirects[orgTitle]) {
      this.redirectTo(this.redirects[orgTitle], body);
    }

    await this.queueService.add(orgTitle, body);

    // await fsPromises.appendFile('temp/log.txt', `${JSON.stringify(body)}\n`);

    this.redisService.redirectUrls.map((url) => this.redirectTo(url, body));
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
    this.logEvents(body);
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
    if (!body.members.length) return;

    const callId: string = body.callid;
    const currentCall: CallEntity = await this.callService.findById(callId);
    if (!currentCall) {
      console.log('currentCall', currentCall, JSON.stringify(body, null, 2));
    }

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
    const isFinished =
      customerInfo.memberstatus === 'BYE' || findExtStatus('BYE');
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
    } else if (!isFinished) {
      return;
    }

    const title = extractOrgTitle(orgSourceName);
    const org = await this.orgService.findByTitle(title);
    if (!org) {
      console.error(`org ${title} not found`);
      return;
    }

    const customer = await this.customerService.create(org.id, userPhone);

    const call: Partial<ICall> = {
      callId,
      type,
      orgId: org.id,
      customerId: customer.id,
      createdAt: new Date(),
    };
    if (status) {
      call.status = status;
    }
    if (isFinished) {
      call.finishedAt = new Date();
    }

    await this.callService.create(call);
  }

  private logEvents(body) {
    if (!this.redisService.logEnabled) return;
    const str = JSON.stringify(body, null, 2);
    if (
      !this.redisService.logTemplate ||
      str.toLowerCase().includes(this.redisService.logTemplate.toLowerCase())
    ) {
      console.log('event:', str);
    }
  }
}
