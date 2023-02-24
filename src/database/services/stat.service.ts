import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatEntity } from '../entities/stat.entity';
import { ICall } from '../../types';

@Injectable()
export class StatService {
  constructor(
    @InjectRepository(StatEntity)
    private statRepository: Repository<StatEntity>,
  ) {}

  async create(entityId: number, phone: string, call: ICall) {
    const stat = this.statRepository.create();
    stat.entityId = entityId;
    stat.phone = phone;
    stat.callType = call.type;
    stat.callStatus = call.status;
    stat.talkDuration = call.talkDuration;
    stat.waitDuration = call.callDuration - call.talkDuration;
    stat.createdAt = new Date();

    await this.statRepository.insert(stat);
  }
}
