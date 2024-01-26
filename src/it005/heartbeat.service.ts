import { Inject, Injectable } from '@nestjs/common';
import { It005ApiService } from './it005.api';
import { ConfigService } from '@nestjs/config';
import { DebugConfig } from '../config';

@Injectable()
export class HeartbeatService {
  constructor(
    @Inject(It005ApiService)
    private api: It005ApiService,
    private configService: ConfigService,
  ) {
    const debug = configService.getOrThrow<DebugConfig>('debug');
    console.log('debug', debug);

    if (!debug.newServer) {
      setInterval(() => this.ping(), 5 * 60 * 1000);
      this.ping().then();
    }
  }

  public async ping() {
    await this.api.heartbeat();
  }
}
