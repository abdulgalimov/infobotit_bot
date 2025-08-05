import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CallStatus, CallType, FinishStatus, ICdr } from '../../types';
import { CdrEntity } from '../entities/cdr.entity';
import { InfobotLogger } from '../../logger';

const callToReg = /(?<callto1>[^()]+)(\((?<callto2>.+)\))?/;

@Injectable()
export class CdrService {
  private readonly logger: InfobotLogger;

  constructor(
    @InjectRepository(CdrEntity)
    private cdrRepository: Repository<CdrEntity>,
  ) {
    this.logger = new InfobotLogger(CdrService.name);
  }

  async create(
    orgId: number,
    customerId: number,
    type: CallType,
    status: CallStatus,
    finishStatus: FinishStatus,
    reserveMobile: string | null,
    body: any,
  ) {
    const {
      callduraction,
      talkduraction,
      timestart,
      recording,
      callto,
      callfrom,
      callid,
    } = body;

    const cdr = this.cdrRepository.create();

    const callDuration = +callduraction || 0;
    const talkDuration = +talkduraction || 0;

    cdr.secret = 1_000_000 + Math.floor(Math.random() * 10_000_000);
    cdr.orgId = orgId;
    cdr.customerId = customerId;
    cdr.type = type;
    cdr.status = status;
    cdr.finishStatus = finishStatus;
    cdr.callId = callid;
    const timeStart = this.getDate(timestart);
    cdr.timeStart = timeStart;
    cdr.timeStart = timeStart;
    cdr.waitDuration = callDuration - talkDuration;
    cdr.talkDuration = talkDuration;
    cdr.recording = recording;
    cdr.createdAt = new Date();
    cdr.reserveMobile = reserveMobile;

    if (type === 'Inbound' && callto) {
      callToReg.lastIndex = 0;
      const exec = callToReg.exec(`${callto}`);
      const { callto1, callto2 } = exec.groups;
      cdr.callto1 = callto1;
      cdr.callto2 = callto2;
    }

    if (type === 'Outbound' && callfrom) {
      callToReg.lastIndex = 0;
      const exec = callToReg.exec(`${callfrom}`);
      const { callto1, callto2 } = exec.groups;
      cdr.callto1 = callto1;
      cdr.callto2 = callto2;
    }

    try {
      await this.cdrRepository.insert(cdr);
    } catch (error) {
      this.logger.errorCustom('Failed to insert cdr', {
        error,
        cdr,
      });
      throw error;
    }

    return cdr;
  }

  private getDate(dateSource: string) {
    let date: Date;
    try {
      date = new Date(dateSource);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      this.logger.errorCustom('Failed parse date', {
        error,
        dateSource,
      });
      date = new Date();
    }
    return date;
  }

  async findLastAnswered(customerId: number) {
    const date = new Date();
    date.setDate(date.getDate() - 2);

    return this.cdrRepository.find({
      where: {
        customerId,
        status: CallStatus.ANSWERED,
        createdAt: Between(date, new Date()),
      },
    });
  }

  async updateTelegramFileId(id: number, telegramFileId: string) {
    await this.cdrRepository.update(
      {
        id,
      },
      {
        telegramFileId,
      },
    );
  }

  async findById(id: number) {
    return this.cdrRepository.findOne({
      where: {
        id,
      },
    });
  }

  async findByCallId(callId: string) {
    return this.cdrRepository.findOne({
      where: {
        callId,
      },
    });
  }

  async findLastNoAnswered(customerId: number): Promise<ICdr[]> {
    return this.cdrRepository.find({
      where: {
        customerId,
        status: CallStatus.NO_ANSWER,
        finishStatus: FinishStatus.NO_ANSWER,
      },
    });
  }

  async updateFinishStatus(id: number, finishStatus) {
    return this.cdrRepository.update(
      {
        id,
      },
      {
        finishStatus,
        finishedAt: new Date(),
      },
    );
  }
}
