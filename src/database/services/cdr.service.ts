import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CallStatus, CallType } from '../../types';
import { CdrEntity } from '../entities/cdr.entity';

@Injectable()
export class CdrService {
  constructor(
    @InjectRepository(CdrEntity)
    private cdrRepository: Repository<CdrEntity>,
  ) {}

  async create(orgId: number, customerId: number, type: CallType, body: any) {
    const cdr = this.cdrRepository.create();

    const callDuration = +body.callduraction || 0;
    const talkDuration = +body.talkduraction || 0;

    cdr.orgId = orgId;
    cdr.customerId = customerId;
    cdr.type = type;
    cdr.status = body.status;
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
        createdAt: LessThan(date),
        customerId,
        status: CallStatus.ANSWERED,
      },
    });
  }
}
