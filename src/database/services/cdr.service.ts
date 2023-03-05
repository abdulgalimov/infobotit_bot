import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CallStatus, CallType, FinishStatus, ICdr } from '../../types';
import { CdrEntity } from '../entities/cdr.entity';

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
    cdr.timeStart = body.timestart;
    cdr.timeStart = body.timestart;
    cdr.waitDuration = callDuration - talkDuration;
    cdr.talkDuration = talkDuration;
    cdr.recording = body.recording;
    cdr.createdAt = new Date();

    await this.cdrRepository.insert(cdr);

    return cdr;
  }

  async findLastAnswered(customerId: number) {
    const date = new Date();
    date.setDate(date.getDate() - 2);

    return this.cdrRepository.find({
      where: {
        createdAt: Between(date, new Date()),
        customerId,
        status: CallStatus.ANSWERED,
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

  async findBySecret(secret: number) {
    return this.cdrRepository.findOne({
      where: {
        secret,
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
