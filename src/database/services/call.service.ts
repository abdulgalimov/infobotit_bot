import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CallEntity } from '../entities/call.entity';
import { ICall } from '../../types/interfaces/call';

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(CallEntity)
    private callRepository: Repository<CallEntity>,
  ) {
    setInterval(() => {
      this.clearFinishedCalls();
    }, 1000);
  }

  async clearFinishedCalls() {
    const date = new Date();
    date.setDate(date.getDate() - 1);

    await this.callRepository.delete({
      finishedAt: LessThan(date),
    });
  }

  async findById(callId: string): Promise<CallEntity> {
    return this.callRepository.findOne({
      where: {
        callId,
      },
    });
  }

  async deleteById(callId: string) {
    return this.callRepository.delete({
      callId,
    });
  }

  async create(call: Partial<ICall>) {
    const saved: CallEntity = await this.callRepository.findOne({
      where: {
        callId: call.callId,
      },
    });
    if (saved) {
      await this.callRepository.update({ callId: call.callId }, call);
    } else {
      await this.callRepository.insert(call);
    }

    return call;
  }
}
