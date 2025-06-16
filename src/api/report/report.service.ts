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
    this.redisService.redirectUrls.map((url) => this.redirectTo(url, body));

    if (this.localService) return;

    let orgTitle: string = null;
    switch (body.event) {
      case 'NewCdr':
        orgTitle = getOrgTitleFromNewCdrEvent(body);
        if (!orgTitle) return;
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
      default:
        // console.log('Unknown body.event', JSON.stringify(body, null, 2));
        return;
    }
    if (!orgTitle) {
      console.error('get org fail', JSON.stringify(body, null, 2));
      return;
    }

    // if (this.redirects && this.redirects[orgTitle]) {
    //   this.redirectTo(this.redirects[orgTitle], body);
    // }

    await this.queueService.add(orgTitle, body);

    // await fsPromises.appendFile('temp/log.txt', `${JSON.stringify(body)}\n`);
  }

  private async redirectTo(url: string, body) {
    try {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        timeout: 3000,
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
  }

  private async extractOrg(orgSourceName: string): Promise<IOrg> {
    const title = extractOrgTitle(orgSourceName);
    return this.orgService.findByTitle(title);
  }

  async newCrdHandler(body: any) {
    const {
      dsttrcunkname,
      srctrunkname,
      callfrom,
      callto,
      callid,
      callduraction,
    } = body;

    let type = body.type;

    const call = await this.callService.findById(callid);

    let orgSourceName: string;
    let userPhone: string;
    switch (type) {
      case 'Inbound':
        orgSourceName = srctrunkname;
        userPhone = callfrom;
        break;
      case 'Outbound':
        orgSourceName = dsttrcunkname;
        if (call.reserveMobile) {
          /**
           * RESERVE MOBILE PHONE!
           * Если произошел параллельный звонок на резервный номер,
           * прилетает cdr типом Outbound, надо его поменять на Inbound
           */
          type = 'Inbound';
          userPhone = callfrom;
        } else {
          userPhone = callto;
        }
        break;
      default:
        orgSourceName = '';
        break;
    }

    if (userPhone) {
      userPhone = normalizePhone(userPhone);
    }

    const org = await this.extractOrg(orgSourceName);
    if (!org) {
      console.error(`Org for source name: "${orgSourceName}" not found`);
      return;
    }

    const customer = await this.customerService.create(org.id, userPhone);

    let cdrStatus: CallStatus;
    let finishStatus: FinishStatus;
    if (call?.status === CallStatus.TALK) {
      cdrStatus = CallStatus.ANSWERED;
      finishStatus =
        type === 'Inbound' ? FinishStatus.USER_CALL : FinishStatus.USER_ANSWER;
    } else {
      cdrStatus = CallStatus.NO_ANSWER;
      finishStatus = FinishStatus.NO_ANSWER;
    }

    await this.callService.deleteById(body.callid);

    if (callduraction === '1' && cdrStatus === CallStatus.NO_ANSWER) {
      console.log('ignore phantom call', body);
      return;
    }

    const cdr = await this.cdrService.create(
      org.id,
      customer.id,
      type,
      cdrStatus,
      finishStatus,
      call.reserveMobile,
      body,
    );

    if (cdr.status === CallStatus.NO_ANSWER) {
      if (type === CallType.Inbound) {
        // ресторан не ответил
        await this.notificationService.sendMissingCall(cdr, org, customer);
      } else if (type === CallType.Outbound) {
        // клиент не ответил на перезвон
        await this.notificationService.removeMissingCall(org, customer);
      }
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
    const cdr = await this.cdrService.findByCallId(callId);
    if (cdr) {
      console.debug('Ignore call after create cdr');
      return;
    }

    const currentCall: CallEntity = await this.callService.findById(callId);

    let reserveMobile: string | null = null;
    function findExtStatus(
      status: string,
      checkReserveMobile: boolean,
    ): boolean {
      const extStatus = !!body.members.find(
        (member) => member.ext?.memberstatus === status,
      );
      if (extStatus) {
        return true;
      }

      if (checkReserveMobile) {
        /**
         * RESERVE MOBILE PHONE!
         *
         * статус звонка определяется из outbound.memberstatus для Inbound и Buy
         */
        const reserveMobileMember = body.members.find(
          (member) => member.outbound?.memberstatus === status,
        );
        if (reserveMobileMember) {
          reserveMobile = reserveMobileMember.outbound.to;
        }
        return !!reserveMobile;
      }

      return false;
    }

    const member = body.members.find(
      (member) => member['inbound'] || member['outbound'],
    );
    if (!member) {
      return;
    }

    const customerInfo = member['inbound'] || member['outbound'];
    const orgSourceName: string = customerInfo.trunkname;

    const title = extractOrgTitle(orgSourceName);
    const org = await this.orgService.findByTitle(title);
    if (!org) {
      console.error(`org ${title} not found`);
      return;
    }

    let type: CallType;
    let userPhone: string;
    if (member['inbound']) {
      type = CallType.Inbound;
      userPhone = customerInfo.from;
    } else if (member['outbound']) {
      type = CallType.Outbound;
      userPhone = customerInfo.to;
    } else {
      throw new Error(`Invalid call type: ${callId}`);
    }

    let status: CallStatus;
    const isFinished =
      customerInfo.memberstatus === 'BYE' || findExtStatus('BYE', true);
    if (!currentCall) {
      status = CallStatus.ALERT;
    } else if (
      type === CallType.Inbound &&
      customerInfo.memberstatus === 'ANSWERED' &&
      findExtStatus('ANSWER', true)
    ) {
      status = CallStatus.TALK;
    } else if (
      type === CallType.Outbound &&
      customerInfo.memberstatus === 'ANSWER' &&
      findExtStatus('ANSWERED', false)
    ) {
      status = CallStatus.TALK;
    } else if (!isFinished) {
      return;
    }

    if (userPhone) {
      userPhone = normalizePhone(userPhone);
    }

    const customer = await this.customerService.create(org.id, userPhone);

    const call: Partial<ICall> = {
      callId,
      type,
      orgId: org.id,
      customerId: customer.id,
      createdAt: new Date(),
      reserveMobile,
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
