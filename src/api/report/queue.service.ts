import Bull from 'bull';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConfig } from '../../config';
import { Job, Queue, DoneCallback, JobOptions } from 'bull';
import { OrgService } from '../org.service';
import { InfobotLogger } from '../../logger';

type Callback = (body: any) => void;

const jobOptions: JobOptions = {
  removeOnComplete: true,
  removeOnFail: true,
  delay: 1,
  timeout: 600000,
};

@Injectable()
export class QueueService {
  private queues: Record<any, Bull.Queue> = {};
  private callback: Callback;
  private redisConfig: RedisConfig;

  private readonly logger: InfobotLogger;

  constructor(
    configService: ConfigService,
    @Inject(OrgService)
    private orgService: OrgService,
  ) {
    this.redisConfig = configService.getOrThrow<RedisConfig>('redis');

    this.logger = new InfobotLogger(QueueService.name);
  }

  public async init() {
    const { orgs } = await this.orgService.getList();

    orgs.map((org) => this.createByTitle(org.title));
    this.createByTitle('system');
  }

  private createByTitle(orgTitle: string) {
    if (!this.queues[orgTitle]) {
      const queue = new Bull(orgTitle, {
        defaultJobOptions: jobOptions,
        settings: {
          retryProcessDelay: 100,
        },
        redis: {
          port: this.redisConfig.port,
          host: this.redisConfig.host,
        },
      });
      queue.process(this.process.bind(this));
      this.queues[orgTitle] = queue;
    }
    return this.queues[orgTitle];
  }

  public async add(orgTitle: string, body: any) {
    const queue: Queue = this.createByTitle(orgTitle || 'system');
    await queue.add(body, jobOptions);
    await queue.clean(10000);
  }

  public onProcess(callback: Callback) {
    this.callback = callback;
  }

  public async process(job: Job, done: DoneCallback) {
    try {
      await this.callback(job.data);
      done();
    } catch (error) {
      this.logger.errorCustom('Failed proces job', {
        error,
        data: job.data,
      });
      done(error);
    }
  }
}
