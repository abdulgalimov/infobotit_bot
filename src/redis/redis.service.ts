import { Global, Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisManager } from '@liaoliaots/nestjs-redis';

@Global()
@Injectable()
export class RedisService implements OnModuleInit {
  private readonly KEY = 'runtime_config';

  private readonly client: Redis;
  public logEnabled: boolean;
  public logTemplate: string;
  public redirectUrls: string[] = [];

  constructor(private readonly redisManager: RedisManager) {
    this.client = this.redisManager.clients.get('default');
  }

  async onModuleInit() {
    const dataStr = await this.client.get(this.KEY);
    const data = dataStr ? JSON.parse(dataStr) : {};
    this.logEnabled = !!data.logEnabled;
    this.logTemplate = data.logTemplate || '';
    this.redirectUrls = data.redirectUrls || [];
  }

  public save() {
    this.client.set(
      this.KEY,
      JSON.stringify({
        logEnabled: this.logEnabled,
        logTemplate: this.logTemplate,
        redirectUrls: this.redirectUrls,
      }),
    );
  }
}
