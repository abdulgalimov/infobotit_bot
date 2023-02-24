import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { CallStatus, CallType } from '../../types';
import { CdrEntity } from '../entities/cdr.entity';

@Injectable()
export class CdrService {
  constructor(
    @InjectRepository(CdrEntity)
    private cdrRepository: Repository<CdrEntity>,
  ) {}

  async create(orgId: number, phone: string, type: CallType, body: any) {
    const cdr = this.cdrRepository.create();

    cdr.orgId = orgId;
    cdr.phone = phone;
    cdr.type = type;
    cdr.status = body.status;
    cdr.callId = body.callid;
    cdr.timeStart = body.timestart;
    cdr.timeStart = body.timestart;
    cdr.callDuration = +body.callduraction || 0;
    cdr.talkDuration = +body.talkduraction || 0;
    cdr.recording = body.recording;
    cdr.createdAt = new Date();

    await this.cdrRepository.insert(cdr);

    return cdr;
  }

  async findLastAnswered(orgIds: number[], phone: string) {
    const date = new Date();
    date.setDate(date.getDate() - 2);

    return this.cdrRepository.find({
      where: {
        createdAt: LessThan(date),
        phone,
        orgId: In(orgIds),
        status: CallStatus.ANSWERED,
      },
    });
  }
}
