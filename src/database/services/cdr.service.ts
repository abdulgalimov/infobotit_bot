import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CallStatus, CallType, FinishStatus, ICdr } from '../../types';
import { CdrEntity } from '../entities/cdr.entity';

const callToReg = /(?<callto1>[^()]+)(\((?<callto2>.+)\))?/;

@Injectable()
export class CdrService {
  constructor(
    @InjectRepository(CdrEntity)
    private cdrRepository: Repository<CdrEntity>,
  ) {}

  async create(
    orgId: number,
    customerId: number,
    type: CallType,
    status: CallStatus,
    body: any,
  ) {
    const cdr = this.cdrRepository.create();

    const callDuration = +body.callduraction || 0;
    const talkDuration = +body.talkduraction || 0;

    cdr.secret = 1_000_000 + Math.floor(Math.random() * 10_000_000);
    cdr.orgId = orgId;
    cdr.customerId = customerId;
    cdr.type = type;
    cdr.status = status;
    cdr.callId = body.callid;
    const timeStart = this.getDate(body.timestart);
    cdr.timeStart = timeStart;
    cdr.timeStart = timeStart;
    cdr.waitDuration = callDuration - talkDuration;
    cdr.talkDuration = talkDuration;
    cdr.recording = body.recording;
    cdr.createdAt = new Date();

    if (body.type === 'Inbound' && body.callto) {
      const callto = `${body.callto}`;
      callToReg.lastIndex = 0;
      const exec = callToReg.exec(callto);
      const { callto1, callto2 } = exec.groups;
      cdr.callto1 = callto1;
      cdr.callto2 = callto2;
    }

    try {
      await this.cdrRepository.insert(cdr);
    } catch (err) {
      console.log('insert error', cdr);
      throw err;
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
    } catch (err) {
      console.log('invalid pare date', dateSource);
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
