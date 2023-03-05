import * as Bull from 'bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConfig } from '../../config';
import { Job, Queue } from 'bull';

type Callback = (body: any) => void;

@Injectable()
export class QueueService {
  private queues: Record<any, Bull.Queue> = {};
  private callback: Callback;
  private redisConfig: RedisConfig;

  constructor(configService: ConfigService) {
    this.redisConfig = configService.getOrThrow<RedisConfig>('redis');
  }

  private getByCallId(orgTitle: string) {
    if (!this.queues[orgTitle]) {
      const queue = new Bull(orgTitle, {
        redis: {
          port: this.redisConfig.port,
          host: this.redisConfig.host,
        },
      });
      queue.process(this.process);
      this.queues[orgTitle] = queue;
    }
    return this.queues[orgTitle];
  }

  public async add(orgTitle: string, body: any) {
    const queue: Queue = this.getByCallId(orgTitle || 'system');
    await queue.add(body);
  }

  public onProcess(callback: Callback) {
    this.callback = callback;
  }

  public async process(job: Job) {
    await this.callback(job.data);
  }
}
